import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIER_PRICES = {
  premium_producer: process.env.STRIPE_PREMIUM_PRODUCER_PRICE_ID!,
  pro_artist: process.env.STRIPE_PRO_ARTIST_PRICE_ID!,
  business_producer: process.env.STRIPE_BUSINESS_PRODUCER_PRICE_ID!,
}

export async function POST(req: Request) {
  try {
    const { tierId, userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    if (tierId === "free") {
      return NextResponse.json(
        { error: "Cannot subscribe to free tier" },
        { status: 400 }
      )
    }

    const priceId = TIER_PRICES[tierId as keyof typeof TIER_PRICES]
    if (!priceId) {
      return NextResponse.json(
        { error: "Invalid tier selected" },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscriptions?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/subscriptions?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        tierId,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json(
      { error: "Error creating checkout session" },
      { status: 500 }
    )
  }
} 