"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AIChat } from "@/components/AIChat"
import Link from "next/link"
import { Instagram, Sparkles, Music, Album } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { usePlayer } from '@/contexts/PlayerContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import React from 'react'

export default function Home() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  // This state is used to trigger shuffle mode in the SiteWideBeatPlayer
  const [shuffleTrigger, setShuffleTrigger] = useState(0)
  const [glow, setGlow] = useState(false)
  const { isPlaying, setPreloadedBeats } = usePlayer();
  const { user } = useAuth()
  const router = useRouter()
  const [showSignupDialog, setShowSignupDialog] = useState(false)
  const [signupDialogType, setSignupDialogType] = useState<'cover' | 'lyrics' | 'album'>('cover')
  // YouTube video URL - replace with your video URL
  const youtubeVideoUrl = "dQw4w9WgXcQ" // Add your YouTube video URL here (e.g., "https://www.youtube.com/watch?v=VIDEO_ID" or just "VIDEO_ID")
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

  const handleCreateAiCover = () => {
    if (user) {
      router.push('/ai-cover')
    } else {
      setSignupDialogType('cover')
      setShowSignupDialog(true)
    }
  }

  const handleCreateAiLyrics = () => {
    if (user) {
      router.push('/lyrics-ai')
    } else {
      setSignupDialogType('lyrics')
      setShowSignupDialog(true)
    }
  }

  const handleCreateAlbum = () => {
    if (user) {
      router.push('/mylibrary?tab=albums&openAlbum=true')
    } else {
      setSignupDialogType('album')
      setShowSignupDialog(true)
    }
  }

  // Helper function to extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string => {
    if (!url) return ''
    // If it's already just an ID, return it
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      return url
    }
    // Extract ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : url
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
        {/* YouTube Video Embed */}
        {youtubeVideoUrl && (
          <div className="w-full max-w-4xl mt-8 mb-8">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${getYouTubeVideoId(youtubeVideoUrl)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}
      </div>
      
      {/* AI Chat Component */}
      <div className="mb-8">
        <AIChat />
      </div>

      {/* Create AI Tools Promo Buttons */}
      <div className="text-center mb-8 mt-8 space-y-4">
        <Button
          onClick={handleCreateAiCover}
          className="text-2xl md:text-3xl font-semibold py-6 px-10 rounded-xl shadow-2xl hover:scale-105 transition-all duration-300 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430] border-2 border-transparent"
          style={{
            minWidth: '280px',
            minHeight: '70px',
          }}
        >
          <Sparkles className="mr-3 h-6 w-6" />
          Create Ai Cover
        </Button>
        <div className="flex items-center justify-center gap-4 my-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#F4C430] to-transparent flex-1 max-w-[100px]"></div>
          <span className="text-[#F4C430] text-xl font-semibold">OR</span>
          <div className="h-px bg-gradient-to-r from-transparent via-[#F4C430] to-transparent flex-1 max-w-[100px]"></div>
        </div>
        <div>
          <Button
            onClick={handleCreateAiLyrics}
            variant="outline"
            className="text-2xl md:text-3xl font-semibold py-6 px-10 rounded-xl shadow-lg hover:scale-105 transition-all duration-300 bg-transparent text-[#F4C430] border-2 border-[#F4C430] hover:bg-[#F4C430] hover:text-black"
            style={{
              minWidth: '280px',
              minHeight: '70px',
            }}
          >
            <Music className="mr-3 h-6 w-6" />
            Create Ai Lyrics
          </Button>
        </div>
        <div className="flex items-center justify-center gap-4 my-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#2a2a2a] to-transparent flex-1 max-w-[100px]"></div>
          <span className="text-[#2a2a2a] text-xl font-semibold">OR</span>
          <div className="h-px bg-gradient-to-r from-transparent via-[#2a2a2a] to-transparent flex-1 max-w-[100px]"></div>
        </div>
        <div>
          <Button
            onClick={handleCreateAlbum}
            variant="ghost"
            className="text-xl md:text-2xl font-medium py-5 px-8 rounded-lg shadow-md hover:scale-105 transition-all duration-300 bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:bg-[#2a2a2a] hover:text-white hover:border-[#3a3a3a]"
            style={{
              minWidth: '280px',
              minHeight: '60px',
            }}
          >
            <Album className="mr-3 h-5 w-5" />
            Start Album Creation
          </Button>
        </div>
      </div>
      
      {/* Platform Promo Section */}
      <div className="max-w-4xl mx-auto mb-12 px-4">
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-8 border border-[#2a2a2a] shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Ai music tools
          </h2>
          <p className="text-lg text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            Music Platform for content creators, artists, and producers. Create Ai Covers, Generate and Edit lyrics using Ai.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Link href="/mp3-mp4-converter" className="flex items-start gap-4 group">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🔄</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#F4C430] transition-colors">MP3/MP4 Converter</h3>
                <p className="text-gray-400">Convert audio and video files between formats with professional quality</p>
              </div>
            </Link>
            <Link href="/ai-lyrics-editor" className="flex items-start gap-4 group">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">✨</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#F4C430] transition-colors">AI Lyrics</h3>
                <p className="text-gray-400">Generate creative lyrics, edit with AI assistance, and bring your songs to life</p>
              </div>
            </Link>
            <Link href="/aicovermaker" className="flex items-start gap-4 group">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🎨</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#F4C430] transition-colors">AI Cover Maker</h3>
                <p className="text-gray-400">Create stunning album covers and artwork with AI-powered design tools</p>
              </div>
            </Link>
            <Link href="/ai-album-creation" className="flex items-start gap-4 group">
              <div className="text-[#F4C430] text-2xl flex-shrink-0">🎵</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#F4C430] transition-colors">AI Album Creation</h3>
                <p className="text-gray-400">Generate album covers with AI, then automatically create track titles that match your artwork's aesthetic</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full flex justify-center mt-16 mb-8">
        <div className="block w-full max-w-xl">
          <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-200 shadow-lg p-6 flex flex-col items-center justify-center hover:scale-105 transition-transform cursor-pointer border-2 border-yellow-400">
            <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
              <span role="img" aria-label="signup">✨</span> Start Your Free Trial
            </h2>
            <p className="text-black text-base mb-3">Join Beatheos today and get 1 month free! Create AI covers, generate lyrics, and access all premium features.</p>
            <Button 
              onClick={() => {
                if (user) {
                  router.push('/dashboard')
                } else {
                  router.push('/signup')
                }
              }}
              className="bg-black text-yellow-400 font-semibold px-8 py-2 rounded-full text-lg hover:bg-yellow-500 hover:text-black transition-all mt-2"
            >
              {user ? 'Go to Dashboard' : 'Sign Up Now - Free Trial'}
            </Button>
          </div>
        </div>
      </div>

      {/* Logo at Bottom */}
      <div className="w-full flex flex-col items-center justify-center mt-16 mb-8">
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

      {/* Signup Dialog */}
      <Dialog open={showSignupDialog} onOpenChange={setShowSignupDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white">
              {signupDialogType === 'cover' 
                ? 'Sign Up to Create AI Covers' 
                : signupDialogType === 'lyrics'
                ? 'Sign Up to Create AI Lyrics'
                : 'Sign Up to Create Albums'}
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              {signupDialogType === 'cover'
                ? 'Create an account to start generating stunning AI-powered album covers and artwork.'
                : signupDialogType === 'lyrics'
                ? 'Create an account to start generating and editing lyrics with AI assistance.'
                : 'Create an account to start creating albums with AI-powered cover art and track title generation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-400 mb-4">
              {signupDialogType === 'cover'
                ? 'Join Beatheos to access our AI Cover Maker and create professional album covers in seconds.'
                : signupDialogType === 'lyrics'
                ? 'Join Beatheos to access our AI Lyrics tool and create, edit, and enhance your lyrics with AI.'
                : 'Join Beatheos to access our album creation tools. Generate AI covers, create track titles, and build your music library.'}
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSignupDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSignupDialog(false)
                router.push('/signup')
              }}
              className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black hover:from-[#E8E8E8] hover:to-[#F4C430]"
            >
              Sign Up Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

