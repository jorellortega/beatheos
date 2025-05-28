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

    // Fetch beat info from Supabase (include title, price, and producer display_name)
    const { data: beat, error } = await supabase
      .from('beats')
      .select(`
        id,
        title,
        price,
        mp3_url,
        wav_url,
        stems_url,
        producer_id,
        producers:producer_id (display_name)
      `)
      .eq('id', beatId)
      .single()
    if (error || !beat) return NextResponse.json({ error: 'Beat not found' }, { status: 404 })

    const userId = session.metadata?.userId || null;
    const guestEmail = session.metadata?.guestEmail || null;
    const licenseType = session.metadata?.licenseType || null;
    const price = session.amount_total ? session.amount_total / 100 : null;
    const downloadUrl = beat.mp3_url || beat.wav_url || beat.stems_url || null;

    let insertResult = null;
    let insertError = null;
    if (userId) {
      // Prevent duplicate purchases for logged-in users
      const { data: existingPurchase } = await supabase
        .from('beat_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('beat_id', beatId)
        .maybeSingle();
      if (!existingPurchase) {
        const { error } = await supabase.from('beat_purchases').insert({
          user_id: userId,
          beat_id: beatId,
          purchase_date: new Date().toISOString(),
          price,
          license_type: licenseType,
          download_url: downloadUrl,
        });
        insertResult = 'attempted';
        insertError = error;
      } else {
        insertResult = 'already_exists';
      }
    } else if (guestEmail) {
      // Handle guest purchases
      const { error } = await supabase.from('beat_purchases').insert({
        guest_email: guestEmail,
        beat_id: beatId,
        purchase_date: new Date().toISOString(),
        price,
        license_type: licenseType,
        download_url: downloadUrl,
      });
      insertResult = 'guest_attempted';
      insertError = error;
    } else {
      insertResult = 'no_identifier';
    }

    // Fetch buyer/artist display_name if userId is present
    let buyer = null;
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', userId)
        .single();
      if (!userError && user) {
        buyer = user;
      }
    }

    return NextResponse.json({ beat, userId, buyer, guestEmail, licenseType, price, insertResult, insertError })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 