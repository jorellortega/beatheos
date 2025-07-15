import { NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

export async function POST(req: Request) {
  try {
    const { amount } = await req.json()
    if (!amount || typeof amount !== "number" || amount < 1) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // USD cents
      currency: "usd",
      // Optionally, add metadata or receipt_email
    })
    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 