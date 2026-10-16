'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type FeatureItem = {
  icon: LucideIcon
  title: string
  description: string
}

type FaqItem = {
  question: string
  answer: string
}

type FeaturePromoProps = {
  title: string
  subtitle: string
  about: string
  features: FeatureItem[]
  highlights: string[]
  faqs: FaqItem[]
  related?: { href: string; label: string; description: string }[]
}

export function FeaturePromo({
  title,
  subtitle,
  about,
  features,
  highlights,
  faqs,
  related = [
    { href: '/create-song', label: 'Create Song', description: 'Generate a vocal or instrumental track from lyrics and a style prompt.' },
    { href: '/lyrics-ai', label: 'AI Lyrics', description: 'Write, generate, and organize lyrics for your next release.' },
    { href: '/ai-cover', label: 'AI Cover', description: 'Make album and single artwork from a description.' },
  ],
}: FeaturePromoProps) {
  return (
    <article className="min-h-screen bg-[#141414] py-12 text-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <header className="text-center mb-16">
          <p className="text-sm uppercase tracking-[0.2em] text-[#F4C430] mb-4">Beatheos AI music tools</p>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-text text-transparent">
            {title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-6 max-w-3xl mx-auto">
            {subtitle}
          </p>
          <p className="text-gray-400 max-w-3xl mx-auto mb-8">{about}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/signup">Sign up</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary hover:text-black text-lg px-8 py-6"
            >
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary hover:text-black text-lg px-8 py-6"
            >
              <Link href="/subscriptionplans">View plans</Link>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-[#2a2a2a]">
                <CardHeader>
                  <Icon className="h-12 w-12 text-[#F4C430] mb-4" />
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mb-16">
          <h2 className="text-4xl font-bold text-center mb-12">What you can do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {highlights.map((item) => (
              <div
                key={item}
                className="flex items-start gap-4 p-6 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]"
              >
                <CheckCircle className="h-6 w-6 text-[#F4C430] flex-shrink-0 mt-1" />
                <p className="text-gray-300 text-lg">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="mb-16" aria-labelledby="related-tools">
          <h2 id="related-tools" className="text-4xl font-bold text-center mb-12">More Beatheos tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-6 hover:border-[#F4C430] transition-colors"
              >
                <h3 className="text-xl font-semibold text-white mb-2">{item.label}</h3>
                <p className="text-gray-400">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-16" aria-labelledby="faq">
          <h2 id="faq" className="text-4xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6 max-w-3xl mx-auto">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-6">
                <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                <p className="text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-12 border border-[#2a2a2a]">
          <h2 className="text-4xl font-bold mb-6">Ready to start?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Sign up or log in to use {title} on Beatheos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="gradient-button text-black font-semibold text-lg px-8 py-6">
              <Link href="/signup">Sign up</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary hover:text-black text-lg px-8 py-6"
            >
              <Link href="/login">Log in</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
