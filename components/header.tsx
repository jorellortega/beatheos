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

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const pathname = usePathname()
  const { user, logout, hydrated } = useAuth()
  const [producerId, setProducerId] = useState<string | null>(null)
  const [producerSlug, setProducerSlug] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const getDashboardPath = () => {
    const role = user?.role?.toLowerCase();
    if (!role) return null;
    if (role === "admin") return "/dashboard/admin";
    if (role === "business_producer" || role === "producer_business") return "/dashboard/business_producer";
    if (role === "pro_artist") return "/dashboard/pro_artist";
    if (role === "free_artist") return "/dashboard/artist";
    if (role === "free_producer") return "/dashboard/free_producer";
    if (role === "premium_producer") return "/dashboard/premium_producer";
    return null;
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
        setProducerSlug(null)
        return
      }
      const { data, error } = await supabase
        .from('producers')
        .select('id, slug')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setProducerId(data.id)
        setProducerSlug(data.slug)
      } else {
        setProducerId(null)
        setProducerSlug(null)
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

  // Modern Mobile Overlay Menu
  const MobileMenuOverlay = () => (
    <div
      className="fixed inset-0 z-[100] bg-black bg-opacity-95 flex flex-col justify-between items-center transition-all animate-fade-in"
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <div className="w-full flex justify-end p-4">
        <button
          className="text-white text-4xl p-2 rounded-full hover:bg-primary/20 focus:outline-none"
          onClick={e => { e.stopPropagation(); setIsMobileMenuOpen(false); }}
          aria-label="Close menu"
        >
          <X size={36} />
        </button>
      </div>
      <nav className="flex flex-col items-center justify-center flex-1 w-full space-y-8">
      {mobileNavItems
        .filter((item) => !(user?.role === "free_artist" && item.name === "Upload Beat"))
        .map((item) => (
          <Link
            key={item.path}
            href={item.path}
              className={`text-2xl font-semibold transition-colors ${
                pathname === item.path ? "text-primary" : "text-gray-300 hover:text-white"
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.name}
          </Link>
        ))}
      {user ? (
        <>
          {user && getDashboardPath() && (
            <Button variant="outline" className="text-white hover:text-primary" asChild>
              <Link href={getDashboardPath() as string}>Dashboard</Link>
            </Button>
          )}
          {producerId && producerSlug && (
            <Link
              href={`/producers/${producerSlug}`}
                className="text-2xl font-semibold text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Profile
            </Link>
          )}
          <Link
            href="/settings"
              className="text-2xl font-semibold text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Settings
          </Link>
        </>
      ) : (
        <>
          <Link
            href="/signup"
              className="text-2xl font-semibold text-gray-300 hover:text-white"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Sign Up
          </Link>
        </>
      )}
      </nav>
      <div className="w-full flex justify-center p-6">
        <button
          className="text-white text-xl px-8 py-3 rounded-full bg-primary hover:bg-yellow-400 focus:outline-none font-bold shadow-lg"
          onClick={e => { e.stopPropagation(); setIsMobileMenuOpen(false); }}
        >
          Close Menu
        </button>
      </div>
    </div>
  )

  // Add this early in the component to prevent rendering until hydrated
  if (!hydrated) return null;

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
                {user && getDashboardPath() && (
                  <Button variant="outline" className="text-white hover:text-primary" asChild>
                    <Link href={getDashboardPath() as string}>Dashboard</Link>
                  </Button>
                )}
                {producerId && producerSlug && (
                  <Button variant="outline" className="text-white hover:text-primary" asChild>
                    <Link href={`/producers/${producerSlug}`}>Profile</Link>
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
                      {getDashboardPath() ? (
                        <Link href={getDashboardPath() as string} className="w-full">
                          Dashboard
                        </Link>
                      ) : null}
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
              <Button className="gradient-button text-black font-medium hover:text-white">
                <Link href="/login">Login</Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-white hover:text-primary" onClick={() => setIsMobileMenuOpen(true)}>
                  <Menu size={24} />
                </Button>
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
      {isMobileMenuOpen && <MobileMenuOverlay />}
    </header>
  )
}

