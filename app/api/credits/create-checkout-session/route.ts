import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
})
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { product_id } = body as { product_id?: string }
  if (!product_id) {
    return NextResponse.json({ error: 'product_id required' }, { status: 400 })
  }

  const { data: product, error: productError } = await supabase
    .from('credit_products')
    .select('id, name, credits, price_cents')
    .eq('id', product_id)
    .eq('active', true)
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const baseUrl = process.env.BASE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const origin = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`

  let customerId: string | null = null
  const { data: userRow } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()
  customerId = userRow?.stripe_customer_id ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: `${product.credits} credits for AI features (covers, lyrics, album creation)`,
          },
          unit_amount: product.price_cents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${origin}/credits?success=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/credits?canceled=1`,
    client_reference_id: user.id,
    metadata: {
      type: 'credit_purchase',
      product_id: product.id,
      credits: String(product.credits),
      user_id: user.id,
    },
  })

  return NextResponse.json({ url: session.url, sessionId: session.id })
}
