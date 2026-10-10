import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Poppins } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import Header from "@/components/header"
import { SiteWideBeatPlayer } from "@/components/SiteWideBeatPlayer"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"
import { JsonLd } from "@/components/JsonLd"
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Beatheos',
    'AI music platform',
    'AI song generator',
    'AI lyrics',
    'AI album cover',
    'create song from lyrics',
    'music production AI',
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE_URL },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', function(event) {
      console.debug('[DEBUG] Unhandled promise rejection:', event);
      if (event.reason && event.reason.name === 'AbortError' && event.reason.message && event.reason.message.includes('aborted')) {
        // Suppress fetch abort errors from wavesurfer.js
        event.preventDefault();
      }
    });
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5771281829620343"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${poppins.className} ${poppins.variable} gradient-bg min-h-screen text-white bg-[#141414]`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <PlayerProvider>
              <div className="relative min-h-screen">
                <Header />
                <main className="pt-24 pb-20">
                  {children}
                </main>
                <SiteWideBeatPlayer />
                <Toaster />
              </div>
            </PlayerProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

import './globals.css'