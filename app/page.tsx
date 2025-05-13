import { Button } from "@/components/ui/button"
import { TopLists } from "@/components/home/TopLists"
import Link from "next/link"
import { Instagram } from 'lucide-react'

export default function Home() {
  return (
    <main style={{ backgroundColor: '#141414', minHeight: '100vh', padding: '2rem' }}>
      <div className="text-center mb-12 mt-12 sm:mt-16">
        <h1 className="text-4xl font-bold mb-4 text-primary">Welcome to Beatheos</h1>
        <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-300">
          Transcend mortal rhythms in the divine audioscape of Beatheos. Create, explore, and dominate the realm of
          celestial compositions.
        </p>
        <Button
          className="bg-transparent text-white font-medium py-2 px-6 rounded-full shadow-lg hover:bg-gradient-to-r hover:from-[#F4C430] hover:to-[#E8E8E8] hover:text-black transition-all duration-300 border-2 border-transparent bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-padding-box"
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

      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <TopLists />
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
            href="https://instagram.com/beat.theos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:underline gap-1"
          >
            <Instagram size={20} />
            @beat.theos
          </a>
        </div>
      </footer>
    </main>
  )
}

