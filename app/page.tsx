import { Button } from "@/components/ui/button"
import { TopLists } from "@/components/home/TopLists"
import Link from "next/link"
import { Instagram } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseClient'

async function getBrandingLogo() {
  const { data, error } = await getSupabaseClient().from('branding').select('image_url').order('id', { ascending: true }).limit(1)
  if (error || !data || !data[0]?.image_url) return null
  return data[0].image_url
}

export default async function Home() {
  const logoUrl = await getBrandingLogo()
  return (
    <main style={{ backgroundColor: '#141414', minHeight: '100vh', padding: '2rem' }}>
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-0">
        {/* Logo Placeholder or Real Logo */}
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-[36rem] h-[18rem] object-contain" />
        ) : (
          <div className="w-[36rem] h-[18rem] flex items-center justify-center text-6xl font-bold text-gray-300" style={{ background: 'none', border: 'none' }}>
            LOGO
          </div>
        )}
      </div>
      <div className="text-center mb-8 mt-0">
        <Button
          className="mt-0 bg-transparent text-white font-medium py-2 px-6 rounded-full shadow-lg hover:bg-gradient-to-r hover:from-[#F4C430] hover:to-[#E8E8E8] hover:text-black transition-all duration-300 border-2 border-transparent bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] bg-clip-padding-box"
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

