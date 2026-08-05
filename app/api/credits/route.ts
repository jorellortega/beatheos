import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('credit_balance')
    .eq('id', user.id)
    .single()

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('id, amount, balance_after, type, reference_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const { data: products } = await supabase
    .from('credit_products')
    .select('id, name, credits, price_cents, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  const { data: actions } = await supabase
    .from('credit_actions')
    .select('action_key, credits_cost, description')

  return NextResponse.json({
    balance: userRow.credit_balance ?? 0,
    transactions: transactions ?? [],
    products: products ?? [],
    actionCosts: (actions ?? []).reduce((acc, a) => {
      acc[a.action_key] = a.credits_cost
      return acc
    }, {} as Record<string, number>),
  })
}
