import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Sparkles, Edit3, Mic, FileText, Zap, CheckCircle, Music } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Lyrics Editor - Generate & Edit Lyrics with Artificial Intelligence | Beatheos',
  description: 'Generate creative lyrics, edit with AI assistance, and bring your songs to life. AI-powered lyrics editor for songwriters, rappers, and musicians. Create, edit, and enhance lyrics with artificial intelligence.',
  keywords: 'AI lyrics, AI lyrics generator, lyrics editor, AI songwriting, generate lyrics, edit lyrics, AI music, song lyrics AI, rap lyrics generator, AI writing assistant, lyrics AI tool, artificial intelligence lyrics',
  openGraph: {
    title: 'AI Lyrics Editor - Generate & Edit Lyrics with AI',
    description: 'Generate creative lyrics, edit with AI assistance, and bring your songs to life. AI-powered lyrics editor for songwriters.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Lyrics Editor - Generate & Edit Lyrics with AI',
    description: 'Generate creative lyrics, edit with AI assistance, and bring your songs to life.',
  },
}

export default function AILyricsEditorPage() {
  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            AI Lyrics Editor
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Generate creative lyrics, edit with AI assistance, and bring your songs to life. Powered by advanced artificial intelligence for songwriters, rappers, and musicians.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/lyrics-ai">Start Creating Lyrics</Link>
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
              <Sparkles className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">AI Lyrics Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Generate creative and original lyrics using AI. Create verses, choruses, and complete songs with artificial intelligence assistance.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Edit3 className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">AI-Powered Editing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Edit and enhance your lyrics with AI. Get suggestions, improve flow, fix rhymes, and refine your songwriting with artificial intelligence.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Mic className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Text-to-Speech</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Convert your lyrics to speech with AI voice synthesis. Hear how your lyrics sound before recording.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Why Use AI Lyrics Editor?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Creative AI Assistance</h3>
                <p className="text-gray-400">Get creative suggestions and ideas from AI to overcome writer's block and enhance your songwriting.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Multiple Genres</h3>
                <p className="text-gray-400">Generate lyrics for any genre - hip-hop, pop, rock, R&B, country, and more with AI-powered genre understanding.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Rhyme & Flow Analysis</h3>
                <p className="text-gray-400">AI analyzes rhyme schemes, syllable counts, and flow patterns to help perfect your lyrics.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Save & Organize</h3>
                <p className="text-gray-400">Save all your lyrics projects, organize by genre, and access your AI-generated content anytime.</p>
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
                <CardTitle className="text-white">Songwriters</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Generate ideas, overcome writer's block, and refine your songs with AI-powered lyrics editing and suggestions.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Rappers & Hip-Hop Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Create rap verses, improve flow, find rhymes, and perfect your bars with AI assistance designed for hip-hop.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Musicians & Bands</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Collaborate on lyrics, generate ideas for new songs, and use AI to enhance your creative process.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-12 border border-[#2a2a2a]">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Create Amazing Lyrics?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using our AI lyrics editor today. Generate, edit, and perfect your songs with artificial intelligence. Free trial available.
          </p>
          <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
            <Link href="/lyrics-ai">
              Start Creating Lyrics
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

