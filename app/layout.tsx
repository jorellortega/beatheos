import type React from "react"
import "./globals.css"
import { Poppins } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import Header from "@/components/header"
import { SiteWideBeatPlayer } from "@/components/SiteWideBeatPlayer"
import { Toaster } from "@/components/ui/toaster"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-poppins",
})

export const metadata = {
  title: "Beatheos - Realm of the Beat God",
  description: "Transcend mortal rhythms in the divine audioscape of Beatheos",
  generator: 'v0.dev'
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