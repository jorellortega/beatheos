"use client"

import { createContext, useState, useContext, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

interface User {
  id: string
  email: string | null
  role?: string | null
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<User>
  signup: (email: string, password: string, username: string, role: string) => Promise<User>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function fetchUserRole(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", id)
    .single()
  return data?.role ?? null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (data?.user) {
        const role = await fetchUserRole(data.user.id)
        setUser({ id: data.user.id ?? '', email: data.user.email ?? null, role })
      } else {
        setUser(null)
    }
    setIsLoading(false)
    }
    getSession()
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const role = await fetchUserRole(session.user.id)
        setUser({ id: session.user.id ?? '', email: session.user.email ?? null, role })
      } else {
        setUser(null)
      }
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message || "Invalid login credentials")
    const role = await fetchUserRole(data.user.id)
    const userObj = { id: data.user.id ?? '', email: data.user.email ?? null, role }
    setUser(userObj)
    return userObj
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

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

