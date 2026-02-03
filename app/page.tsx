"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AIChat } from "@/components/AIChat"
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
  const { isPlaying, setPreloadedBeats } = usePlayer();
  // Optionally, you can use context or a global event bus for more complex comms

  useEffect(() => {
    async function fetchLogo() {
      const { data, error } = await supabase.from('branding').select('image_url').order('id', { ascending: true }).limit(1)
      if (error || !data || !data[0]?.image_url) return setLogoUrl(null)
      setLogoUrl(data[0].image_url)
    }
    fetchLogo()

    // Preload beats data for instant player start
    async function preloadBeats() {
      // 1. Fetch beats (no join)
      const { data: beats, error } = await supabase
        .from('beats')
        .select('id, title, mp3_url, cover_art_url, slug, producer_id, average_rating, total_ratings')
        .eq('is_draft', false)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error || !beats) return;
      // 2. Collect all unique producer_ids
      const producerIds = Array.from(new Set(beats.map((b) => b.producer_id).filter(Boolean)));
      // 3. Fetch producers
      let producerMap: Record<string, any> = {};
      if (producerIds.length > 0) {
        const { data: producers, error: prodError } = await supabase
          .from('producers')
          .select('user_id, display_name, slug')
          .in('user_id', producerIds);
        if (!prodError && producers) {
          producerMap = Object.fromEntries(producers.map((p) => [p.user_id, { display_name: p.display_name, slug: p.slug }]));
        }
      }
      // 4. Merge producer info into beats
      const beatsWithProducers = beats.map((beat) => {
        const producer = producerMap[beat.producer_id] || {};
        return {
          id: beat.id,
          title: beat.title,
          audioUrl: beat.mp3_url,
          image: beat.cover_art_url,
          slug: beat.slug || beat.id.toString(),
          artist: producer.display_name || '',
          producerSlug: producer.slug || '',
          producers: producer.slug ? [{ display_name: producer.display_name, slug: producer.slug }] : [],
          averageRating: beat.average_rating ?? 0,
          totalRatings: beat.total_ratings ?? 0,
        };
      });
      setPreloadedBeats(beatsWithProducers);
    }
    preloadBeats();
  }, [setPreloadedBeats]);

  // This will be used to trigger shuffle and expand the player
  const handleLogoClick = () => {
    console.log('[DEBUG] Logo clicked');
    // Set high ratings as default shuffle mode
    sessionStorage.setItem('shuffleMode', 'high_ratings');
    // Dispatch a custom event for the SiteWideBeatPlayer to listen to
    window.dispatchEvent(new CustomEvent('trigger-shuffle-full-player'));
    console.log('[DEBUG] Dispatched trigger-shuffle-full-player event');
    setShuffleTrigger(x => x + 1); // for local state if needed
    setGlow(true);
    setTimeout(() => setGlow(false), 600);
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
      
      {/* AI Chat Component */}
      <div className="mb-8">
        <AIChat />
      </div>
      
      <div className="text-center mb-8 mt-8">
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

      {/* Platform Promo Section */}
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#2a2a2a] shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            The Complete Music Creation Platform
          </h2>
          <p className="text-lg text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            Beatheos is your all-in-one destination for creating, distributing, and monetizing music. Whether you're a producer, artist, or creator, we've got everything you need to bring your musical vision to life.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🎵</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Beat Marketplace</h3>
                <p className="text-gray-400">Browse and purchase high-quality beats from talented producers worldwide</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">✂️</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Editor</h3>
                <p className="text-gray-400">Advanced audio editing with waveform visualization and precise manipulation</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🔄</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">MP3/MP4 Converter</h3>
                <p className="text-gray-400">Convert audio and video files between formats with professional quality</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">✨</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Lyrics</h3>
                <p className="text-gray-400">Generate creative lyrics, edit with AI assistance, and bring your songs to life</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🎨</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">AI Cover Maker</h3>
                <p className="text-gray-400">Create stunning album covers and artwork with AI-powered design tools</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">💿</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Albums & Singles</h3>
                <p className="text-gray-400">Create and release your music with professional album creation tools</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">👥</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Thriving Community</h3>
                <p className="text-gray-400">Connect with creators, share your work, and discover new talent</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🎤</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Artist Page</h3>
                <p className="text-gray-400">Create professional artist profiles to showcase your music and connect with fans</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🏢</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Label Management</h3>
                <p className="text-gray-400">Manage your music label, artists, releases, and distribution all in one place</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center mt-16 mb-8">
        <Link href="/feed" className="block w-full max-w-xl">
          <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-200 shadow-lg p-6 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer border-2 border-yellow-400">
            <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
              <span role="img" aria-label="community">🌐</span> Join the Community Feed
            </h2>
            <p className="text-black text-base mb-3">See what others are posting, share your own updates, and connect with fellow creators!</p>
            <Button className="bg-black text-yellow-400 font-semibold px-8 py-2 rounded-full text-lg hover:bg-yellow-500 hover:text-black transition-all mt-2">
              Visit the Feed
            </Button>
          </div>
        </Link>
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

