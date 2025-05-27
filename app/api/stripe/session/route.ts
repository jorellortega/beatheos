import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabase } from '@/lib/supabaseClient'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' as any })

export async function POST(req: NextRequest) {
  const { session_id } = await req.json()
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    const beatId = session.metadata?.beatId || session.client_reference_id
    if (!beatId) return NextResponse.json({ error: 'No beatId found' }, { status: 400 })

    // Fetch beat file URLs from Supabase
    const { data: beat, error } = await supabase
      .from('beats')
      .select('mp3_url, wav_url, stems_url')
      .eq('id', beatId)
      .single()
    if (error || !beat) return NextResponse.json({ error: 'Beat not found' }, { status: 404 })

    const userId = session.metadata?.userId || null;
    const licenseType = session.metadata?.licenseType || null;
    const price = session.amount_total ? session.amount_total / 100 : null;
    const downloadUrl = beat.mp3_url || beat.wav_url || beat.stems_url || null;

    // Only insert if userId is present
    if (userId) {
      // Prevent duplicate purchases
      const { data: existingPurchase } = await supabase
        .from('beat_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('beat_id', beatId)
        .maybeSingle();
      if (!existingPurchase) {
        await supabase.from('beat_purchases').insert({
          user_id: userId,
          beat_id: beatId,
          purchase_date: new Date().toISOString(),
          price,
          license_type: licenseType,
          download_url: downloadUrl,
        });
      }
    }

    return NextResponse.json({ beat })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 