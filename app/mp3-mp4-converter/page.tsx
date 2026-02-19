import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, FileAudio, Video, Download, Zap, Shield, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'MP3 MP4 Converter - Free AI-Powered Audio Video Converter | Beatheos',
  description: 'Convert audio and video files between MP3, MP4, WAV, and more formats with professional quality. Free AI-powered converter for music producers, artists, and content creators. Fast, secure, and easy to use.',
  keywords: 'MP3 converter, MP4 converter, audio converter, video converter, AI converter, free converter, music converter, audio format converter, video format converter, WAV converter, professional audio converter',
  openGraph: {
    title: 'MP3 MP4 Converter - Free AI-Powered Audio Video Converter',
    description: 'Convert audio and video files between formats with professional quality. Free AI-powered converter for music creators.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MP3 MP4 Converter - Free AI-Powered Audio Video Converter',
    description: 'Convert audio and video files between formats with professional quality.',
  },
}

export default function MP3MP4ConverterPage() {
  return (
    <div className="min-h-screen bg-[#141414] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            MP3 MP4 Converter
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Convert audio and video files between formats with professional quality. Powered by AI technology for the best results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/mp4converter">Start Converting Now</Link>
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
              <FileAudio className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Audio Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Convert between MP3, WAV, FLAC, AAC, OGG, and more audio formats. Maintain professional quality with AI-powered processing.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Video className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">Video Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Convert MP4, AVI, MOV, MKV, and other video formats. Extract audio from videos or convert video files seamlessly.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
            <CardHeader>
              <Zap className="h-12 w-12 text-[#F4C430] mb-4" />
              <CardTitle className="text-2xl">AI-Powered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Advanced AI technology ensures the highest quality conversions. Fast processing with professional-grade results.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12 text-white">Why Choose Our AI Converter?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Professional Quality</h3>
                <p className="text-gray-400">AI-powered conversion maintains the highest audio and video quality standards.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Fast Processing</h3>
                <p className="text-gray-400">Convert files quickly with our optimized AI processing engine.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Secure & Private</h3>
                <p className="text-gray-400">Your files are processed securely. We never store or share your content.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Multiple Formats</h3>
                <p className="text-gray-400">Support for all major audio and video formats used by professionals.</p>
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
                <CardTitle className="text-white">Music Producers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Convert audio files for your music production workflow. Export in the format you need for your DAW or distribution platform.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Content Creators</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Convert video files for your content. Extract audio from videos or convert between video formats for different platforms.</p>
              </CardContent>
            </Card>
            <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
              <CardHeader>
                <CardTitle className="text-white">Artists & Musicians</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Prepare your music files for streaming, downloads, or distribution. Convert to the exact format required by platforms.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-12 border border-[#2a2a2a]">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Convert Your Files?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Start using our AI-powered MP3 MP4 converter today. Free trial available with credits to test all features.
          </p>
          <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
            <Link href="/mp4converter">
              Start Converting Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

