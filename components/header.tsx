"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Bell, User, LogOut } from "lucide-react"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const getDashboardPath = () => {
    switch (user?.role) {
      case "admin":
        return "/dashboard/admin"
      case "business_producer":
        return "/dashboard/business_producer"
      case "pro_artist":
        return "/dashboard/pro_artist"
      case "free_artist":
        return "/dashboard/free_artist"
      case "free_producer":
        return "/dashboard/free_producer"
      case "premium_producer":
        return "/dashboard/premium_producer"
      default:
        return "/dashboard"
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Producers", path: "/producers" },
    { name: "Beats", path: "/beats" },
    { name: "Subscription", path: "/subscription" },
    { name: "Upload Beat", path: "/upload-beat" },
  ]

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 gradient-header`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link href="/" className="mr-8">
              <span className="text-2xl font-bold font-display text-primary">BEATHEOS</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="outline" className="text-white hover:text-primary" asChild>
                  <Link href={getDashboardPath()}>Dashboard</Link>
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                  <Bell size={20} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                      <User size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border-primary">
                    <DropdownMenuItem>
                      <Link href={getDashboardPath()} className="w-full">
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Link href="/settings" className="w-full">
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" className="text-white hover:text-primary">
                  <Link href="/login">Login</Link>
                </Button>
                <Button className="gradient-button text-black font-medium hover:text-white">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
        <nav className="flex space-x-6">
          {navItems
            .filter((item) => !(user?.role === "free_artist" && item.name === "Upload Beat"))
            .map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`transition-colors ${
                  pathname === item.path ? "text-primary font-semibold" : "text-gray-300 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
        </nav>
      </div>
    </header>
  )
}

