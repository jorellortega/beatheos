"use client"

import { createContext, useState, useContext, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"

interface User {
  id: string
  email: string | null
  role: string | null
  subscription_tier?: string | null
  subscription_status?: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, username: string, role: string, subscriptionTier?: string, subscriptionStatus?: string) => Promise<User>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fetch user info (role, subscription_tier, subscription_status)
async function fetchUserInfo(id: string): Promise<{ role: string | null, subscription_tier?: string | null, subscription_status?: string | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("role, subscription_tier, subscription_status")
    .eq("id", id)
    .single()
  return {
    role: data?.role ?? null,
    subscription_tier: data?.subscription_tier ?? null,
    subscription_status: data?.subscription_status ?? null,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let mounted = true;
    let hydratedTimeout = setTimeout(async () => {
      if (!hydrated && mounted) {
        console.warn('Auth hydration timeout reached - forcing hydration');
        setHydrated(true);
        setIsLoading(false);
      }
    }, 5000); // Increased timeout to 5 seconds

    // Get initial session
    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user && mounted) {
          const userInfo = await fetchUserInfo(session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            role: userInfo.role,
            subscription_tier: userInfo.subscription_tier,
            subscription_status: userInfo.subscription_status,
          })
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
          setHydrated(true)
        }
        clearTimeout(hydratedTimeout)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        if (session?.user) {
          const userInfo = await fetchUserInfo(session.user.id)
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            role: userInfo.role,
            subscription_tier: userInfo.subscription_tier,
            subscription_status: userInfo.subscription_status,
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error handling auth state change:', error)
        setUser(null)
      } finally {
        if (mounted) {
          setIsLoading(false)
          setHydrated(true)
        }
        clearTimeout(hydratedTimeout)
      }
    })

    return () => {
      mounted = false;
      clearTimeout(hydratedTimeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error;
      if (!data.user) throw new Error("No user data received");
      
    const userInfo = await fetchUserInfo(data.user.id)
      const userObj: User = { 
        id: data.user.id, 
        email: data.user.email ?? null, 
        role: userInfo.role,
        subscription_tier: userInfo.subscription_tier,
        subscription_status: userInfo.subscription_status,
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

  const signup = async (email: string, password: string, username: string, role: string, subscriptionTier?: string, subscriptionStatus?: string): Promise<User> => {
    setIsLoading(true);
    try {
      // 1. Create user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
      if (error || !data.user) throw new Error(error?.message || "Signup failed");

      // 2. Insert into users table
      const { error: userError } = await supabase
        .from("users")
        .insert({
          id: data.user.id,
          email,
          username,
          role,
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionStatus,
          created_at: new Date().toISOString(),
          display_name: username
        });
      if (userError) throw new Error(userError.message);

      // 3. Insert into producers table (for ALL users)
      const { error: producerError } = await supabase
        .from("producers")
        .insert({
          user_id: data.user.id,
          display_name: username,
          created_at: new Date().toISOString()
        });
      if (producerError) throw new Error(producerError.message);

      // Fetch user info and set user state as before
      const userInfo = await fetchUserInfo(data.user.id);
      const userObj = { id: data.user.id ?? '', email: data.user.email ?? null, role: userInfo.role, subscription_tier: userInfo.subscription_tier, subscription_status: userInfo.subscription_status };
      setUser(userObj);
      return userObj;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
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

  // Only render children after hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-primary">Loading...</span>
      </div>
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

