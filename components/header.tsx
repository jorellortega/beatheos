"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Bell, User, LogOut, Menu, X } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [producerId, setProducerId] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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

  useEffect(() => {
    async function fetchProducerId() {
      if (!user) {
        setProducerId(null)
        return
      }
      const { data, error } = await supabase
        .from('producers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (data && data.id) {
        setProducerId(data.id)
      } else {
        setProducerId(null)
      }
    }
    fetchProducerId()
  }, [user])

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Producers", path: "/producers" },
    { name: "Beats", path: "/beats" },
    { name: "Subscription", path: "/subscriptionplans" },
    { name: "Upload Beat", path: "/upload-beat" },
  ]

  // Only include nav items except Beats and Beat Vault for mobile dropdown
  const mobileNavItems = navItems.filter(item => item.name !== "Beats")

  const MobileNav = () => (
    <div className="flex flex-col space-y-4 p-4">
      {mobileNavItems
        .filter((item) => !(user?.role === "free_artist" && item.name === "Upload Beat"))
        .map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`text-lg transition-colors ${
              pathname === item.path ? "text-primary font-semibold" : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.name}
          </Link>
        ))}
      {user ? (
        <>
          <Link
            href={getDashboardPath()}
            className="text-lg text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          {producerId && (
            <Link
              href={`/producers/${producerId}`}
              className="text-lg text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Profile
            </Link>
          )}
          <Link
            href="/settings"
            className="text-lg text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Settings
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/signup"
            className="text-lg text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sign Up
          </Link>
        </>
      )}
    </div>
  )

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-500 gradient-header`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Link href="/" className="mr-8">
              <span className="text-2xl font-bold font-display text-primary">BEATHEOS</span>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Button variant="outline" className="text-white hover:text-primary" asChild>
                  <Link href={getDashboardPath()}>Dashboard</Link>
                </Button>
                {producerId && (
                  <Button variant="outline" className="text-white hover:text-primary" asChild>
                    <Link href={`/producers/${producerId}`}>Profile</Link>
                  </Button>
                )}
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
                <Button className="gradient-button text-black font-medium hover:text-white" disabled>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu: Beats and Login/Logout always visible */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/beats"
              className={`text-lg px-2 py-1 rounded transition-colors ${pathname === "/beats" ? "text-primary font-semibold" : "text-gray-300 hover:text-white"}`}
            >
              Beats
            </Link>
            {user ? (
              <button
                onClick={logout}
                className="text-lg px-2 py-1 rounded text-gray-300 hover:text-white"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className={`text-lg px-2 py-1 rounded transition-colors ${pathname === "/login" ? "text-primary font-semibold" : "text-gray-300 hover:text-white"}`}
              >
                Login
              </Link>
            )}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:text-primary">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-black border-primary">
                <MobileNav />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop Navigation Menu */}
        <nav className="hidden md:flex space-x-6">
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

