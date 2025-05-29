"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { TopLists } from "@/components/home/TopLists"
import Link from "next/link"
import { Instagram } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePlayer } from '@/contexts/PlayerContext'
import React from 'react'

export default function Home() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  // This state is used to trigger shuffle mode in the SiteWideBeatPlayer
  const [shuffleTrigger, setShuffleTrigger] = useState(0)
  const [glow, setGlow] = useState(false)
  const { isPlaying } = usePlayer();
  // Optionally, you can use context or a global event bus for more complex comms

  useEffect(() => {
    async function fetchLogo() {
      const { data, error } = await supabase.from('branding').select('image_url').order('id', { ascending: true }).limit(1)
      if (error || !data || !data[0]?.image_url) return setLogoUrl(null)
      setLogoUrl(data[0].image_url)
    }
    fetchLogo()
  }, [])

  // This will be used to trigger shuffle and expand the player
  const handleLogoClick = () => {
    // Dispatch a custom event for the SiteWideBeatPlayer to listen to
    window.dispatchEvent(new CustomEvent('trigger-shuffle-full-player'))
    setShuffleTrigger(x => x + 1) // for local state if needed
    setGlow(true)
    setTimeout(() => setGlow(false), 600)
  }

  return (
    <main style={{ backgroundColor: '#141414', minHeight: '100vh', padding: '2rem' }}>
      <style>{`
        /* Remove any outer box glow from the container or border */
        .logo-glow {
          filter: drop-shadow(0 0 8px #fff700cc) drop-shadow(0 0 4px #fff8);
          box-shadow: 0 0 0 0 transparent;
          transition: filter 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
        }
        .logo-glow-pulse {
          filter: drop-shadow(0 0 12px #fff700) drop-shadow(0 0 6px #fff) drop-shadow(0 0 3px #fff700);
          box-shadow: 0 0 0 0 transparent;
          transition: filter 0.5s ease-in-out, box-shadow 0.5s ease-in-out;
        }
      `}</style>
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-0">
        {/* Logo Placeholder or Real Logo */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt="Logo"
            className={`mx-auto select-none transition-all duration-200 ${
              (isPlaying || glow) ? (glow ? 'logo-glow-pulse' : 'logo-glow') : ''
            }`}
            style={{ width: '220px', height: '220px', userSelect: 'none', pointerEvents: 'auto' }}
            onClick={handleLogoClick}
            draggable={false}
          />
        )}
      </div>
      <div className="text-center mb-8 mt-0">
        <Button
          className="mt-0 bg-transparent text-white font-medium py-2 px-6 rounded-full shadow-lg hover:bg-gradient-to-r hover:from-[#F4C430] hover:to-[#E8E8E8] hover:text-black transition-all duration-300 border-2 border-transparent bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-padding-box"
          style={{
            backgroundClip: "padding-box",
            border: "2px solid transparent",
            boxShadow: "0 0 0 2px rgba(0, 0, 0, 0.05), inset 0 0 0 2px rgba(255, 255, 255, 0.1)",
          }}
        >
          <Link href="/beats" className="text-white hover:text-black">
            Explore Divine Realm
          </Link>
        </Button>
      </div>

      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <TopLists />
      </div>
      <footer className="mt-12 text-center text-sm text-gray-500">
        Developed by JOR Powered by{" "}
        <a
          href="https://www.covionstudio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Covion Studio
        </a>
        , Inc
        <div className="mt-2">&copy; 2025 All rights reserved</div>
        <div className="mt-4 flex justify-center items-center gap-2">
          <a
            href="https://instagram.com/beat.heos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:underline gap-1"
          >
            <Instagram size={20} />
            @beat.heos
          </a>
        </div>
      </footer>
    </main>
  )
}

