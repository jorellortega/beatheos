"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  Music, 
  Mic, 
  Users, 
  ShoppingCart, 
  Sparkles, 
  Headphones, 
  Upload, 
  PlayCircle, 
  Edit3, 
  Layers,
  FileAudio,
  Cloud,
  MessageSquare,
  Album,
  ListMusic,
  Radio,
  Settings,
  Zap,
  Palette,
  BarChart3,
  Download,
  Share2,
  Heart,
  Star,
  Globe,
  CreditCard,
  Shield,
  FolderOpen,
  Piano,
  Scissors,
  Target
} from "lucide-react"

export default function FeaturesInfoPage() {
  const targetAudiences = [
    {
      icon: <Music className="w-8 h-8" />,
      title: "Beat Producers",
      description: "Create, upload, and sell your beats. Access professional production tools, manage your catalog, and build your producer brand.",
      features: ["Beat Maker Studio", "Loop Editor", "Upload & Sell Beats", "Producer Profiles", "Analytics Dashboard"]
    },
    {
      icon: <Mic className="w-8 h-8" />,
      title: "Artists & Rappers",
      description: "Discover high-quality beats, purchase licenses, create albums, and release your music. Perfect for independent artists.",
      features: ["Beat Marketplace", "Album Creation", "Lyrics AI", "Artist Profiles", "Music Library"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Music Creators",
      description: "Whether you're a songwriter, composer, or content creator, find everything you need to bring your musical ideas to life.",
      features: ["AI-Powered Tools", "Audio Processing", "Cloud Storage", "Collaboration Tools", "Creative Workflow"]
    },
    {
      icon: <Headphones className="w-8 h-8" />,
      title: "Music Enthusiasts",
      description: "Explore new music, discover talented producers, build playlists, and connect with the music community.",
      features: ["Beat Discovery", "Playlists", "Community Feed", "Artist Discovery", "Music Streaming"]
    }
  ]

  const mainFeatures = [
    {
      icon: <ShoppingCart className="w-6 h-6" />,
      title: "Beat Marketplace",
      description: "Browse and purchase high-quality beats from talented producers. Filter by genre, mood, tempo, and more.",
      link: "/beats",
      color: "from-yellow-400 to-yellow-200"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Loop Editor",
      description: "Advanced audio editing with waveform visualization, pattern creation, markers, and precise audio manipulation.",
      link: "/loop-editor",
      color: "from-purple-400 to-purple-200"
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Lyrics AI",
      description: "AI-powered lyrics generation, editing, and text-to-speech. Create lyrics, scripts, poetry, and prose with AI assistance.",
      link: "/lyrics-ai",
      color: "from-pink-400 to-pink-200"
    },
    {
      icon: <Upload className="w-6 h-6" />,
      title: "Beat Upload & Management",
      description: "Upload beats with metadata, cover art, stems, and WAV files. Organize your catalog and track sales.",
      link: "/upload-beat",
      color: "from-green-400 to-green-200"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Artist & Producer Profiles",
      description: "Create professional profiles, showcase your work, connect with fans, and build your music brand.",
      link: "/artists",
      color: "from-orange-400 to-orange-200"
    },
    {
      icon: <Album className="w-6 h-6" />,
      title: "Albums & Singles",
      description: "Create and release albums or singles with cover art, track listings, and distribution management.",
      link: "/myalbums",
      color: "from-red-400 to-red-200"
    },
    {
      icon: <ListMusic className="w-6 h-6" />,
      title: "Playlists",
      description: "Create custom playlists, organize your favorite beats, and share your musical taste with others.",
      link: "/playlists",
      color: "from-cyan-400 to-cyan-200"
    },
    {
      icon: <Radio className="w-6 h-6" />,
      title: "Community Feed",
      description: "Connect with other creators, share updates, discover new music, and engage with the community.",
      link: "/feed",
      color: "from-indigo-400 to-indigo-200"
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Cloud Services Integration",
      description: "Connect Dropbox and Google Drive for seamless file management and backup of your music projects.",
      link: "/cloud-services",
      color: "from-teal-400 to-teal-200"
    },
    {
      icon: <FileAudio className="w-6 h-6" />,
      title: "Audio Processing",
      description: "Convert audio formats, process files, and manage your audio library with professional tools.",
      link: "/mp4converter",
      color: "from-amber-400 to-amber-200"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "AI Chat Assistant",
      description: "Get help with music creation, beat discovery, and platform navigation from our AI-powered assistant.",
      link: "/ai",
      color: "from-violet-400 to-violet-200"
    }
  ]

  const advancedFeatures = [
    {
      icon: <Piano className="w-5 h-5" />,
      title: "Piano Roll Editor",
      description: "MIDI note editing with velocity control, note duration, and multi-octave support"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Advanced Mixing",
      description: "EQ, compression, reverb, delay, and other professional effects per track"
    },
    {
      icon: <Scissors className="w-5 h-5" />,
      title: "Audio Editing Tools",
      description: "Cut, copy, paste, quantize, and manipulate audio with precision"
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Pattern & Arrangement",
      description: "Create song arrangements with patterns, loops, and sections"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Real-time Processing",
      description: "Low-latency audio processing with Tone.js and Web Audio API"
    },
    {
      icon: <Palette className="w-5 h-5" />,
      title: "Sample Library",
      description: "Built-in sample library with drums, instruments, and sound effects"
    },
    {
      icon: <Download className="w-5 h-5" />,
      title: "Export Options",
      description: "Export your beats in multiple formats including WAV and MP3"
    },
    {
      icon: <Share2 className="w-5 h-5" />,
      title: "Collaboration",
      description: "Share projects, collaborate with other producers, and work together"
    },
    {
      icon: <Heart className="w-5 h-5" />,
      title: "Favorites & Ratings",
      description: "Rate beats, save favorites, and discover trending music"
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: "Licensing System",
      description: "Purchase beats with different license types for various uses"
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: "Subscription Plans",
      description: "Access unlimited beats with flexible subscription options"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Secure Payments",
      description: "Safe and secure payment processing with Stripe integration"
    }
  ]

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0a0a0a] py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Beatheos Platform
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The complete music creation and distribution platform for producers, artists, and creators
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/beats">
              <Button className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold px-8 py-6 text-lg hover:scale-105 transition-transform">
                Explore Beats
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="border-2 border-[#F4C430] text-[#F4C430] font-semibold px-8 py-6 text-lg hover:bg-[#F4C430] hover:text-black transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Who It's Built For */}
      <section className="py-20 px-4 bg-[#141414]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Who It's Built For
          </h2>
          <p className="text-center text-gray-400 mb-12 text-lg max-w-2xl mx-auto">
            Beatheos is designed for everyone in the music ecosystem, from professional producers to independent artists
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {targetAudiences.map((audience, index) => (
              <Card key={index} className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#F4C430] transition-all">
                <CardHeader>
                  <div className="text-[#F4C430] mb-4">{audience.icon}</div>
                  <CardTitle className="text-2xl">{audience.title}</CardTitle>
                  <CardDescription className="text-gray-400 mt-2">
                    {audience.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {audience.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-sm text-gray-300">
                        <span className="text-[#F4C430] mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section className="py-20 px-4 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Core Features
          </h2>
          <p className="text-center text-gray-400 mb-12 text-lg max-w-2xl mx-auto">
            Everything you need to create, distribute, and monetize your music
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainFeatures.map((feature, index) => (
              <Card key={index} className="bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#F4C430] transition-all group">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 text-black group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-gray-400 mt-2">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.link}>
                    <Button variant="ghost" className="text-[#F4C430] hover:text-black hover:bg-[#F4C430] w-full">
                      Explore Feature →
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-20 px-4 bg-[#141414]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Advanced Capabilities
          </h2>
          <p className="text-center text-gray-400 mb-12 text-lg max-w-2xl mx-auto">
            Professional-grade tools and features for serious music production
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedFeatures.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#F4C430] transition-all"
              >
                <div className="text-[#F4C430] flex-shrink-0 mt-1">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="py-20 px-4 bg-[#0f0f0f]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-12 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Why Choose Beatheos?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] text-center p-8">
              <Globe className="w-12 h-12 text-[#F4C430] mx-auto mb-4" />
              <CardTitle className="text-2xl mb-4">All-in-One Platform</CardTitle>
              <CardDescription className="text-gray-300">
                Create, distribute, and monetize your music all in one place. No need to juggle multiple platforms.
              </CardDescription>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] text-center p-8">
              <Zap className="w-12 h-12 text-[#F4C430] mx-auto mb-4" />
              <CardTitle className="text-2xl mb-4">AI-Powered Tools</CardTitle>
              <CardDescription className="text-gray-300">
                Leverage cutting-edge AI for lyrics generation, music creation assistance, and creative workflows.
              </CardDescription>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a] text-center p-8">
              <Users className="w-12 h-12 text-[#F4C430] mx-auto mb-4" />
              <CardTitle className="text-2xl mb-4">Thriving Community</CardTitle>
              <CardDescription className="text-gray-300">
                Connect with producers, artists, and music lovers. Share your work and discover new talent.
              </CardDescription>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#1a1a1a] via-[#141414] to-[#0a0a0a]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            Ready to Start Creating?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of creators who are already using Beatheos to make their music dreams a reality
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold px-10 py-6 text-lg hover:scale-105 transition-transform">
                Create Free Account
              </Button>
            </Link>
            <Link href="/beats">
              <Button variant="outline" className="border-2 border-[#F4C430] text-[#F4C430] font-semibold px-10 py-6 text-lg hover:bg-[#F4C430] hover:text-black transition-all">
                Browse Beats
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <footer className="py-8 px-4 bg-[#0a0a0a] text-center text-gray-500 text-sm">
        <p>© 2025 Beatheos. All rights reserved. Developed by JOR, Powered by Covion Studio, Inc.</p>
      </footer>
    </div>
  )
}

