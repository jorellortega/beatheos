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
  error: Error | null
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
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        setError(null);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          throw sessionError;
        }
        
        if (!mounted) return;
        
        if (session?.user) {
          const userInfo = await fetchUserInfo(session.user.id)
          if (!mounted) return;
          
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
        console.error('Error initializing auth:', error)
        if (mounted) {
          setError(error instanceof Error ? error : new Error('Failed to initialize auth'))
          setUser(null)
          // Clear any potentially corrupted session data
          await supabase.auth.signOut()
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
          setHydrated(true)
        }
      }
    }

    // Initialize auth
    initializeAuth()

    // Set up auth state change listener
    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      try {
        setError(null);
        
        // Handle specific auth events
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsLoading(false)
          return
        }
        
        if (event === 'TOKEN_REFRESHED') {
          // Re-fetch user info after token refresh
          if (session?.user) {
            const userInfo = await fetchUserInfo(session.user.id)
            if (!mounted) return;
            
            setUser({
              id: session.user.id,
              email: session.user.email ?? null,
              role: userInfo.role,
              subscription_tier: userInfo.subscription_tier,
              subscription_status: userInfo.subscription_status,
            })
          }
          return
        }
        
        if (session?.user) {
          const userInfo = await fetchUserInfo(session.user.id)
          if (!mounted) return;
          
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
        if (mounted) {
          setError(error instanceof Error ? error : new Error('Failed to handle auth state change'))
          setUser(null)
          // Clear any potentially corrupted session data
          await supabase.auth.signOut()
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }).data.subscription

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
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
    isLoading,
    error
  }), [user, isLoading, error]);

  // Show loading state only during initial hydration
  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-4 text-primary">Loading...</span>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-red-500">
          <p>Error: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary text-black rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
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

