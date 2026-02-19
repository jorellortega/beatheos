import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Palette, Sparkles, Image, Zap, CheckCircle, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Cover Maker - Create Stunning Album Covers with Artificial Intelligence | Beatheos',
  description: 'Create stunning album covers and artwork with AI-powered design tools. Generate professional album art, single covers, and music artwork using artificial intelligence. Free AI cover maker for musicians and artists.',
  keywords: 'AI cover maker, AI album cover, AI artwork generator, album cover AI, AI art generator, music cover art, AI design tool, artificial intelligence cover maker, AI image generator, album art creator, AI graphics, music artwork AI',
  openGraph: {
    title: 'AI Cover Maker - Create Stunning Album Covers with AI',
    description: 'Create stunning album covers and artwork with AI-powered design tools. Generate professional album art with artificial intelligence.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Cover Maker - Create Stunning Album Covers with AI',
    description: 'Create stunning album covers and artwork with AI-powered design tools.',
  },
}

export default function AICoverMakerPage() {
  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            AI Cover Maker
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Create stunning album covers and artwork with AI-powered design tools. Generate professional album art, single covers, and music artwork using advanced artificial intelligence.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/ai-cover">Create Cover Art Now</Link>
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
              <CardTitle className="text-2xl">AI Art Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Generate unique album covers using AI. Describe your vision and let artificial intelligence create stunning artwork for your music.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Image className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Professional Quality</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Create high-resolution album covers ready for streaming platforms, physical releases, and promotional materials.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Sparkles className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Customizable Styles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Choose from various art styles, genres, and themes. AI adapts to your music's aesthetic and creates matching visuals.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Why Use AI Cover Maker?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Instant Creation</h3>
                <p className="text-gray-400">Generate professional album covers in seconds with AI. No design skills required - just describe your vision.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Cost-Effective</h3>
                <p className="text-gray-400">Save money on expensive graphic designers. Create unlimited album covers with AI at a fraction of the cost.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Multiple Variations</h3>
                <p className="text-gray-400">Generate multiple cover art variations with AI. Choose the perfect design or combine elements from different versions.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Genre-Specific</h3>
                <p className="text-gray-400">AI understands different music genres and creates covers that match hip-hop, pop, rock, electronic, and more.</p>
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
                <p className="text-gray-400">Create professional album covers without hiring expensive designers. Use AI to generate stunning artwork for your releases.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Music Producers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Generate cover art for your beats and instrumentals. Create consistent visual branding with AI-powered design.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Record Labels</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Quickly generate cover art concepts for multiple releases. Use AI to create professional artwork at scale.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-12 border border-[#2a2a2a]">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Create Stunning Album Covers?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using our AI cover maker today. Generate professional album art with artificial intelligence. Free trial available with credits.
          </p>
          <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
            <Link href="/ai-cover">
              Create Cover Art Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

