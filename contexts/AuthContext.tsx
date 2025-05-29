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
  let attempts = 0;
  let lastError: any = null;
  while (attempts < 5) {
    const res = await fetch(`/api/getUser?userId=${id}`);
    console.log(`[fetchUserInfo] Attempt ${attempts + 1}: status=${res.status}`);
    let body = null;
    try { body = await res.clone().json(); } catch { body = await res.clone().text(); }
    console.log(`[fetchUserInfo] Response body:`, body);
    if (res.ok) {
      return {
        role: body?.role ?? null,
        subscription_tier: body?.subscription_tier ?? null,
        subscription_status: body?.subscription_status ?? null,
      };
    } else if (res.status === 404 || res.status === 406) {
      // User not found, wait and retry
      await new Promise(res => setTimeout(res, 400));
      attempts++;
      continue;
    } else {
      lastError = body;
      break;
    }
  }
  throw new Error(lastError || 'Failed to fetch user info');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // PAUSE hydration if signup-in-progress flag is set
    if (typeof window !== 'undefined' && localStorage.getItem('signup-in-progress')) {
      setIsLoading(true);
      setHydrated(false);
      return;
    }

    const checkSessionOnLoad = async () => {
      console.log('[Auth] checkSessionOnLoad running');
      try {
        setError(null);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[Auth] Session on page load:', session);
        if (sessionError) throw sessionError;
        if (!mounted) return;
        if (session?.user) {
          // Directly set user from session.user; role/subscription info not available here
          setUser({
            id: session.user.id,
            email: session.user.email ?? null,
            role: null, // Optionally retrieve from localStorage/sessionStorage if you store it at signup/login
            subscription_tier: null,
            subscription_status: null,
          });
          console.log('[Auth] setUser called:', session.user);
        } else {
          setUser(null);
          console.log('[Auth] setUser called: null');
        }
      } catch (error) {
        console.error('[Auth] Error checking session on load:', error);
        if (mounted) {
          setError(error instanceof Error ? error : new Error('Failed to check session on load'));
          setUser(null);
          console.log('[Auth] setUser called: null (error)');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setHydrated(true);
          console.log('[Auth] hydrated set to true');
        }
      }
    };

    checkSessionOnLoad();

    authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Auth change detected:', event, session);
      if (!mounted) return;
      try {
        if (session) {
          if (session.user) {
            // Directly set user from session.user; role/subscription info not available here
            setUser({
              id: session.user.id,
              email: session.user.email ?? null,
              role: null, // Optionally retrieve from localStorage/sessionStorage if you store it at signup/login
              subscription_tier: null,
              subscription_status: null,
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('[Auth] Error handling auth state change:', error);
        if (mounted) {
          setError(error instanceof Error ? error : new Error('Failed to handle auth state change'));
          setUser(null);
          await supabase.auth.signOut();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }).data.subscription;

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error;
      if (!data.user) throw new Error("No user data received");
      // Directly set user from data.user; role/subscription info not available here
      const userObj: User = {
        id: data.user.id,
        email: data.user.email ?? null,
        role: null, // Optionally retrieve from localStorage/sessionStorage if you store it at signup/login
        subscription_tier: null,
        subscription_status: null,
      };
      setUser(userObj);
      return userObj;
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
          created_at: new Date().toISOString(),
          slug: username.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        });
      if (producerError) throw new Error(producerError.message);

      // Add a 1-second delay before fetching user info to avoid replication lag
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Instead of fetching user info, use the data we just inserted
      const userObj = {
        id: data.user.id ?? '',
        email: data.user.email ?? null,
        role: role,
        subscription_tier: subscriptionTier,
        subscription_status: subscriptionStatus
      };
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

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

