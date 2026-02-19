"use client"

import { createContext, useState, useContext, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabaseClient"

interface User {
  id: string
  email: string | null
  role: string | null
  subscription_tier?: string | null
  subscription_status?: string | null
  username?: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, username: string, role: string, subscriptionTier?: string, subscriptionStatus?: string) => Promise<User>
  logout: () => Promise<void>
  isLoading: boolean
  error: Error | null
  hydrated: boolean
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fetch user info (role, subscription_tier, subscription_status)
async function fetchUserInfo(id: string): Promise<{ role: string | null, subscription_tier?: string | null, subscription_status?: string | null }> {
  let attempts = 0;
  let lastError: any = null;
  const maxAttempts = 8; // Increased from 5 to 8
  const baseDelay = 500; // Increased from 400 to 500ms

  while (attempts < maxAttempts) {
    try {
      const res = await fetch(`/api/getUser?userId=${id}`);
      console.log(`[fetchUserInfo] Attempt ${attempts + 1}/${maxAttempts}: status=${res.status}`);
      
      let body = null;
      try { 
        body = await res.clone().json(); 
      } catch { 
        body = await res.clone().text(); 
      }
      
      console.log(`[fetchUserInfo] Response body:`, body);
      
      if (res.ok) {
        return {
          role: body?.role ?? null,
          subscription_tier: body?.subscription_tier ?? null,
          subscription_status: body?.subscription_status ?? null,
        };
      } else if (res.status === 404 || res.status === 406) {
        // User not found, wait and retry with exponential backoff
        const delay = baseDelay * Math.pow(1.5, attempts);
        console.debug(`[fetchUserInfo] User not found (status ${res.status}), retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        attempts++;
        continue;
      } else {
        lastError = body;
        console.error(`[fetchUserInfo] Non-retryable error:`, body);
        break;
      }
    } catch (error) {
      lastError = error;
      console.error(`[fetchUserInfo] Request failed:`, error);
      const delay = baseDelay * Math.pow(1.5, attempts);
      await new Promise(res => setTimeout(res, delay));
      attempts++;
    }
  }
  
  console.error(`[fetchUserInfo] Final error after ${attempts} attempts:`, lastError);
  throw new Error(lastError?.message || 'Failed to fetch user info');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // On mount, print last error from localStorage if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastAuthError = localStorage.getItem('last-auth-error');
      if (lastAuthError) {
        try {
          const parsed = JSON.parse(lastAuthError);
          console.warn('[AuthProvider] Last auth error from previous session:', parsed);
        } catch {}
      }
    }
  }, []);

  // Save error/debug info to localStorage for post-reload inspection
  useEffect(() => {
    if (error && typeof window !== 'undefined') {
      const debugInfo = {
        errorMessage: error.message,
        errorStack: error.stack,
        user: user ? { id: user.id, email: user.email, role: user.role } : null,
        timestamp: new Date().toISOString(),
        location: window.location.href,
      };
      localStorage.setItem('last-auth-error', JSON.stringify(debugInfo));
    }
  }, [error, user]);

  // Automatically retry after 1.5 seconds if error
  useEffect(() => {
    if (error) {
      console.debug('[AuthProvider] Error detected, will auto-retry in 1.5s:', error);
      const timeout = setTimeout(() => {
        console.debug('[AuthProvider] Auto-retrying (reloading page) due to error:', error);
        window.location.reload();
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    // PAUSE hydration if signup-in-progress flag is set
    if (typeof window !== 'undefined' && localStorage.getItem('signup-in-progress')) {
      setIsLoading(true);
      setHydrated(false);
      return;
    }

    const fetchAndSetUser = async (sessionUser: any) => {
      if (!sessionUser) {
        setUser(null);
        return;
      }
      try {
        const res = await fetch(`/api/getUser?userId=${sessionUser.id}`);
        if (!res.ok) throw new Error('Failed to fetch user info');
        const userInfo = await res.json();
        setUser({
          id: sessionUser.id,
          email: sessionUser.email ?? null,
          role: userInfo?.role ?? null,
          username: userInfo?.username ?? null,
          subscription_tier: userInfo?.subscription_tier ?? null,
          subscription_status: userInfo?.subscription_status ?? null,
        });
      } catch (error) {
        setUser(null);
        setError(error instanceof Error ? error : new Error('Failed to fetch user info'));
      }
    };

    const checkSessionOnLoad = async () => {
      console.log('[Auth] checkSessionOnLoad running');
      try {
        setError(null);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[Auth] Session on page load:', session);
        if (sessionError) throw sessionError;
        if (!mounted) return;
        if (session?.user) {
          await fetchAndSetUser(session.user);
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
        if (session && session.user) {
          await fetchAndSetUser(session.user);
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
      // Fetch user info from backend API
      const res = await fetch(`/api/getUser?userId=${data.user.id}`);
      if (!res.ok) throw new Error('Failed to fetch user info');
      const userInfo = await res.json();
      const userObj: User = {
        id: data.user.id,
        email: data.user.email ?? null,
        role: userInfo?.role ?? null,
        username: userInfo?.username ?? null,
        subscription_tier: userInfo?.subscription_tier ?? null,
        subscription_status: userInfo?.subscription_status ?? null,
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
      // Create user in Supabase Auth with all necessary metadata
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password, 
        options: { 
          data: { 
            username,
            role,
            subscription_tier: subscriptionTier,
            subscription_status: subscriptionStatus
          } 
        } 
      });
      
      if (error || !data.user) throw new Error(error?.message || "Signup failed");

      // Add a small delay to allow the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Use the data from auth metadata
      const userObj = {
        id: data.user.id ?? '',
        email: data.user.email ?? null,
        role: role,
        username: username,
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
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      
      if (error) {
        console.error('Logout error:', error)
        // Continue with cleanup even if signOut fails
      }

      // Clear all auth-related localStorage items
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('beatheos-auth-token')
          localStorage.removeItem('beatheos-auth-token-code-verifier')
          // Clear any other auth-related items
          const keysToRemove: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && (key.includes('beatheos-auth') || key.includes('supabase'))) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key))
        } catch (storageError) {
          console.error('Error clearing localStorage:', storageError)
        }

        // Clear sessionStorage
        try {
          sessionStorage.clear()
        } catch (storageError) {
          console.error('Error clearing sessionStorage:', storageError)
        }
      }

      // Clear user state
      setUser(null)

      // Redirect to home page
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Still clear user state and redirect even on error
      setUser(null)
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    console.log('[AuthContext] getAccessToken called')
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('[AuthContext] getAccessToken session:', session ? 'Found' : 'None', error ? `Error: ${error.message}` : '')
      return session?.access_token || null
    } catch (error) {
      console.error('[AuthContext] getAccessToken error:', error)
      return null
    }
  }

  const contextValue = useMemo(() => ({
    user,
    login,
    signup,
    logout,
    isLoading,
    error,
    hydrated,
    getAccessToken
  }), [user, isLoading, error, hydrated]);

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
    // Log error details for debugging
    console.error('[AuthProvider] Rendering error UI:', error);
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

