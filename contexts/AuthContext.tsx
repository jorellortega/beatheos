"use client"

import { createContext, useState, useContext, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string
  email: string | null
  role: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, username: string, role: string) => Promise<User>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function fetchUserRole(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", id)
    .single()
  return data?.role ?? null
}

async function ensureProducerProfile(user: any) {
  if (!user) return;
  // Only for users with a producer role
  if (user.role !== 'business_producer') return;
  const { data: producer, error } = await supabaseClient
    .from('producers')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!producer) {
    const { error: insertError } = await supabaseClient.from('producers').insert({
      user_id: user.id,
      display_name: user.username || user.email?.split('@')[0] || 'New Producer',
    });
    if (insertError) {
      console.error('Failed to create producer profile:', insertError);
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const role = await fetchUserRole(session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            role
          })
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setIsLoading(true);
        if (session?.user) {
          const role = await fetchUserRole(session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            role
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (user && user.role === 'business_producer') {
      ensureProducerProfile(user);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error;
      if (!data.user) throw new Error("No user data received");
      
      const role = await fetchUserRole(data.user.id)
      const userObj: User = { 
        id: data.user.id, 
        email: data.user.email ?? null, 
        role 
      }
      setUser(userObj)
      return userObj
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  const signup = async (email: string, password: string, username: string, role: string): Promise<User> => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
    if (error || !data.user) throw new Error(error?.message || "Signup failed")
    // Insert or update the role in the users table
    await supabase.from("users").update({ role }).eq("id", data.user.id)
    // Insert into producers table
    await supabase.from("producers").insert({ user_id: data.user.id, display_name: username })
    const userRole = await fetchUserRole(data.user.id)
    const userObj = { id: data.user.id ?? '', email: data.user.email ?? null, role: userRole }
    setUser(userObj)
    return userObj
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const contextValue = useMemo(() => ({
    user,
    login,
    signup,
    logout,
    isLoading
  }), [user, isLoading]);

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

