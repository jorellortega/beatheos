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
        .logo-glow {
          /* Subtle, soft inner glow */
          box-shadow: 0 0 18px 6px #fff700cc, 0 0 8px 2px #fff8;
          filter: drop-shadow(0 0 8px #fff700cc) drop-shadow(0 0 4px #fff8);
          transition: box-shadow 0.2s, filter 0.2s;
        }
        .logo-glow-pulse {
          /* Slightly stronger for pulse */
          box-shadow: 0 0 32px 10px #fff700ee, 0 0 16px 4px #fff;
          filter: drop-shadow(0 0 16px #fff700ee) drop-shadow(0 0 8px #fff);
          transition: box-shadow 0.2s, filter 0.2s;
        }
      `}</style>
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-0">
        {/* Logo Placeholder or Real Logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className={`w-[36rem] h-[18rem] object-contain cursor-pointer ${isPlaying ? 'logo-glow' : ''} ${glow ? 'logo-glow-pulse' : ''}`}
            onClick={handleLogoClick}
            title="Play Shuffle!"
          />
        ) : (
          <div
            className={`w-[36rem] h-[18rem] flex items-center justify-center text-6xl font-bold text-gray-300 cursor-pointer ${isPlaying ? 'logo-glow' : ''} ${glow ? 'logo-glow-pulse' : ''}`}
            style={{ background: 'none', border: 'none' }}
            onClick={handleLogoClick}
            title="Play Shuffle!"
          >
            LOGO
          </div>
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

