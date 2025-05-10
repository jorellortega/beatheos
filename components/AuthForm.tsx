"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthFormProps {
  onSuccess: () => void
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { login, signup } = useAuth()

  const validateForm = () => {
    // Reset error
    setError(null)

    // Username validation for signup
    if (!isLogin) {
      if (!username) {
        setError("Username is required")
        return false
      }
      if (username.length < 3) {
        setError("Username must be at least 3 characters long")
        return false
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setError("Username can only contain letters, numbers, and underscores")
        return false
      }
    }

    // Email validation
    if (!email) {
      setError("Email is required")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address")
      return false
    }

    // Password validation
    if (!password) {
      setError("Password is required")
      return false
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long")
      return false
    }

    // Password confirmation for signup
    if (!isLogin) {
      if (!confirmPassword) {
        setError("Please confirm your password")
        return false
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await signup(email, password, username)
      }
      toast({
        title: isLogin ? "Welcome back!" : "Account created successfully",
        description: isLogin ? "You've been logged in." : "Your account has been created and you're now logged in.",
      })
      onSuccess()
    } catch (error) {
      console.error("Authentication error:", error)
      let errorMessage = "An error occurred during authentication"

      if (error instanceof Error) {
        if (error.message.includes("Username already taken")) {
          errorMessage = "This username is already taken. Please choose another one."
        } else if (error.message.includes("User already registered")) {
          errorMessage = "This email is already registered. Please try logging in instead."
        } else if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password"
        } else if (error.message.includes("Password should be at least 6 characters")) {
          errorMessage = "Password must be at least 6 characters long"
        } else {
          errorMessage = error.message
        }
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setError(null)
    setEmail("")
    setPassword("")
    setConfirmPassword("")
    setUsername("")
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>{isLogin ? "Log In" : "Sign Up"}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={isLoading}
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Please wait..." : isLogin ? "Log In" : "Sign Up"}
          </Button>
        </form>
        <Button variant="link" className="mt-4 w-full" onClick={switchMode} disabled={isLoading}>
          {isLogin ? "Need an account? Sign Up" : "Already have an account? Log In"}
        </Button>
      </CardContent>
    </Card>
  )
}

