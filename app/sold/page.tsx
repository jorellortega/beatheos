"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabaseClient"
import { ShoppingCart, Receipt, Download } from "lucide-react"
import Link from "next/link"

export default function SoldPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    // Fetch purchases (beats the user bought)
    const fetchPurchases = async () => {
      const { data: purchasesData, error: purchasesError } = await supabase
        .from("beat_purchases")
        .select("*, beat:beat_id(id, title, cover_art_url, producer_id), producer:beat_id(producer_id), producer_info:beat_id(producer_id)")
        .eq("user_id", user.id)
        .order("purchase_date", { ascending: false })
      if (purchasesError) return setPurchases([])
      // Fetch producer display names
      const producerIds = Array.from(new Set((purchasesData || []).map((p: any) => p.beat?.producer_id).filter(Boolean)))
      let producerMap: Record<string, string> = {}
      if (producerIds.length > 0) {
        const { data: producers } = await supabase
          .from("producers")
          .select("user_id, display_name")
          .in("user_id", producerIds)
        producerMap = (producers || []).reduce((acc: any, p: any) => { acc[p.user_id] = p.display_name; return acc }, {})
      }
      setPurchases((purchasesData || []).map((p: any) => ({
        ...p,
        beat: p.beat,
        producer_name: producerMap[p.beat?.producer_id] || "Unknown"
      })))
    }
    // Fetch sales (beats the user sold)
    const fetchSales = async () => {
      // 1. Get all your beat IDs
      const { data: myBeats, error: myBeatsError } = await supabase
        .from("beats")
        .select("id, title")
        .eq("producer_id", user.id)
      if (myBeatsError || !myBeats || myBeats.length === 0) return setSales([])
      const beatIds = myBeats.map((b: any) => b.id)
      // 2. Get all purchases for those beats
      const { data: salesData, error: salesError } = await supabase
        .from("beat_purchases")
        .select("*, beat:beat_id(id, title, cover_art_url), buyer:user_id(email)")
        .in("beat_id", beatIds)
        .order("purchase_date", { ascending: false })
      if (salesError) return setSales([])
      setSales((salesData || []).map((s: any) => ({
        ...s,
        beat: s.beat,
        buyer_email: s.buyer?.email || "Unknown"
      })))
    }
    fetchPurchases()
    fetchSales()
    setLoading(false)
  }, [user])

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#141414] px-4 py-12">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-10">
          <ShoppingCart className="mx-auto mb-4 h-16 w-16 text-yellow-400" />
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Sales & Purchases</h1>
          <p className="text-lg text-gray-400 mb-8">View all beats you have sold and purchased.</p>
        </div>
        {/* Purchases Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2"><Receipt className="h-6 w-6 text-yellow-400" /> Purchases</h2>
          {loading ? (
            <div className="flex items-center justify-center min-h-[120px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : purchases.length === 0 ? (
            <div className="text-gray-400 text-center">You have not purchased any beats yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-black border border-primary rounded-lg">
                <thead>
                  <tr className="bg-secondary">
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Producer</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">License</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Download</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p: any) => (
                    <tr key={p.id} className="border-t border-gray-800">
                      <td className="px-4 py-2">{p.beat?.title || "-"}</td>
                      <td className="px-4 py-2">{p.producer_name}</td>
                      <td className="px-4 py-2">{p.price ? `$${Number(p.price).toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-2">{p.license_type || "-"}</td>
                      <td className="px-4 py-2">{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-2">
                        {p.download_url ? (
                          <a href={p.download_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:text-yellow-400"><Download className="h-4 w-4" />Download</a>
                        ) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* Sales Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2"><ShoppingCart className="h-6 w-6 text-yellow-400" /> Sales</h2>
          {loading ? (
            <div className="flex items-center justify-center min-h-[120px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : sales.length === 0 ? (
            <div className="text-gray-400 text-center">You have not sold any beats yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm bg-black border border-primary rounded-lg">
                <thead>
                  <tr className="bg-secondary">
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Buyer</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">License</th>
                    <th className="px-4 py-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s: any) => (
                    <tr key={s.id} className="border-t border-gray-800">
                      <td className="px-4 py-2">{s.beat?.title || "-"}</td>
                      <td className="px-4 py-2">{s.buyer_email}</td>
                      <td className="px-4 py-2">{s.price ? `$${Number(s.price).toFixed(2)}` : "-"}</td>
                      <td className="px-4 py-2">{s.license_type || "-"}</td>
                      <td className="px-4 py-2">{s.purchase_date ? new Date(s.purchase_date).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 