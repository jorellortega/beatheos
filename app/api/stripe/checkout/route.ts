import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-04-30.basil' as any })

export async function POST(req: NextRequest) {
  const { price, productName, beatId, licenseType, userId, guestEmail } = await req.json()
  // Use BASE_URL, SITE_URL, or NEXT_PUBLIC_URL for server-side base URL
  const baseUrl = process.env.BASE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_URL
  if (!baseUrl) {
    return NextResponse.json({ error: 'BASE_URL, SITE_URL, or NEXT_PUBLIC_URL is not set' }, { status: 500 })
  }
  if (!beatId) {
    return NextResponse.json({ error: 'Missing beatId' }, { status: 400 })
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `License Type: ${licenseType}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
      client_reference_id: beatId ? String(beatId) : undefined,
      metadata: {
        beatId: beatId ? String(beatId) : '',
        userId: userId || null,
        guestEmail: guestEmail || null,
        licenseType,
      },
    })
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 