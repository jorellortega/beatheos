"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

export default function Navbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <nav className="bg-black text-white p-4">
      <div className="container flex items-center space-x-8">
        <Link href="/" className="text-3xl font-bold text-[#FFD700]">
          BEATHEOS ��🇽
        </Link>
        <Link href="/" className="text-lg text-white hover:text-[#FFD700]">
          Home
        </Link>
        <Link href="/producers" className="text-lg text-white hover:text-[#FFD700]">
          Producers
        </Link>
        <Link href="/beats" className="text-lg text-white hover:text-[#FFD700]">
          Beats
        </Link>
        <Link href="/subscription" className="text-lg text-white hover:text-[#FFD700]">
          Subscription
        </Link>
        <Link href="/upload-beat" className="text-lg text-white hover:text-[#FFD700]">
          Upload Beat
        </Link>
        <Link href="/ai" className="text-lg text-white hover:text-[#FFD700]">
          AI Assistant
        </Link>
        <Link href="/mp4converter" className="text-lg text-white hover:text-[#FFD700]">
          MP4 Converter
        </Link>
        <Link href="/editdata" className="text-lg text-white hover:text-[#FFD700]">
          Edit Data
        </Link>
      </div>
    </nav>
  )
} 