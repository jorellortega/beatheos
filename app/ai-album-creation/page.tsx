import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Album, Sparkles, Music, Zap, CheckCircle, Palette } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Album Creation - Generate Album Covers & Track Titles with AI | Beatheos',
  description: 'Generate album covers with AI, then automatically create track titles that match your artwork aesthetic. Complete AI-powered album creation workflow for musicians and artists. Create albums with artificial intelligence.',
  keywords: 'AI album creation, AI album cover, AI track titles, album creation AI, AI music production, artificial intelligence album, AI album generator, music album AI, AI album artwork, create album with AI, AI album maker',
  openGraph: {
    title: 'AI Album Creation - Generate Album Covers & Track Titles with AI',
    description: 'Generate album covers with AI, then automatically create track titles that match your artwork aesthetic. Complete AI-powered album creation.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Album Creation - Generate Album Covers & Track Titles with AI',
    description: 'Generate album covers with AI, then automatically create track titles that match your artwork aesthetic.',
  },
}

export default function AIAlbumCreationPage() {
  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            AI Album Creation
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Generate album covers with AI, then automatically create track titles that match your artwork's aesthetic. Complete AI-powered album creation workflow for musicians and artists.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/mylibrary">Start Creating Albums</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-black text-lg px-8 py-6">
              <Link href="/subscriptionplans">View Plans</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Palette className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">AI Cover Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Generate stunning album covers using AI. Create artwork that captures your music's mood, genre, and aesthetic with artificial intelligence.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Music className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">AI Track Title Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Automatically generate track titles that match your album cover's aesthetic. AI analyzes your artwork and creates cohesive track names.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Album className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Complete Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Manage your entire album creation process in one place. From AI-generated covers to track titles to distribution - all powered by AI.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">How AI Album Creation Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-6 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F4C430] flex items-center justify-center text-black font-bold text-xl">1</div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Generate AI Album Cover</h3>
                <p className="text-gray-400">Use our AI cover maker to generate stunning album artwork. Describe your vision or let AI create based on your music genre and style.</p>
              </div>
            </div>
            <div className="flex items-start gap-6 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F4C430] flex items-center justify-center text-black font-bold text-xl">2</div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">AI Analyzes Your Cover Art</h3>
                <p className="text-gray-400">Our AI analyzes your album cover's visual elements, mood, colors, and aesthetic to understand the artistic direction.</p>
              </div>
            </div>
            <div className="flex items-start gap-6 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F4C430] flex items-center justify-center text-black font-bold text-xl">3</div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Generate Matching Track Titles</h3>
                <p className="text-gray-400">AI automatically generates track titles that match your cover art's aesthetic. Each title is cohesive with your album's visual theme.</p>
              </div>
            </div>
            <div className="flex items-start gap-6 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#F4C430] flex items-center justify-center text-black font-bold text-xl">4</div>
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">Complete Your Album</h3>
                <p className="text-gray-400">Add your tracks, edit titles if needed, and prepare your album for release. All powered by AI for a seamless creative workflow.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Why Use AI Album Creation?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Cohesive Visual & Audio Identity</h3>
                <p className="text-gray-400">AI ensures your track titles match your album cover's aesthetic, creating a cohesive visual and audio identity for your release.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Time-Saving Workflow</h3>
                <p className="text-gray-400">Create complete albums faster with AI. Generate covers and track titles in minutes instead of hours or days.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Creative AI Assistance</h3>
                <p className="text-gray-400">Get creative suggestions from AI when you're stuck. Let artificial intelligence inspire your album creation process.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Professional Results</h3>
                <p className="text-gray-400">Create professional-quality albums with AI. From cover art to track titles, everything is designed to industry standards.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Perfect For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Independent Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Create complete albums with AI. Generate covers and track titles that match your artistic vision without hiring expensive designers.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Music Producers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Package your beats into complete albums. Use AI to create cohesive visual and track title concepts for your releases.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Songwriters & Musicians</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Bring your songs together into albums with AI. Generate artwork and track titles that enhance your music's story.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-12 border border-[#2a2a2a]">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Create Your Album with AI?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using our AI album creation tool today. Generate covers and track titles with artificial intelligence. Free trial available with credits.
          </p>
          <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
            <Link href="/mylibrary">
              Start Creating Albums
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

