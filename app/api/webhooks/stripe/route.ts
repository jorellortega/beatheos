import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabase } from '@/lib/supabaseClient'
import { headers } from "next/headers"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

const TIER_MAPPING = {
  premium_producer: "premium_producer",
  pro_artist: "pro_artist",
  business_producer: "business_producer",
}

export async function POST(req: Request) {
  console.log('DEBUG: Stripe webhook POST received');
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const tierId = session.metadata?.tierId
        const beatId = session.metadata?.beatId
        const licenseType = session.metadata?.licenseType

        if (!userId || !tierId) {
          throw new Error("Missing userId or tierId in session metadata")
        }

        // Update user's subscription in database
        const { error } = await supabase
          .from("users")
          .update({
            subscription_tier: TIER_MAPPING[tierId as keyof typeof TIER_MAPPING],
            stripe_customer_id: session.customer,
            subscription_status: "active",
          })
          .eq("id", userId)

        if (error) throw error

        // Beat purchase logic (new)
        if (userId && beatId && licenseType) {
          const { error } = await supabase
            .from("beat_purchases")
            .insert([
              {
                user_id: userId,
                beat_id: beatId,
                purchase_date: new Date().toISOString(),
                price: session.amount_total ? session.amount_total / 100 : null,
                license_type: licenseType,
                download_url: null // Set this if you have a download URL
              }
            ])
          if (error) throw error
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.userId

        if (!userId) {
          throw new Error("Missing userId in subscription metadata")
        }

        // Update user's subscription status in database
        const { error } = await supabase
          .from("users")
          .update({
            subscription_tier: "free",
            subscription_status: "inactive",
          })
          .eq("id", userId)

        if (error) throw error
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json(
      { error: "Webhook error" },
      { status: 400 }
    )
  }
}

// Add a catch-all for unsupported methods (405)
export default function handler() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 })
} 