import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest } from '@/lib/ai-api-helpers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SIGNUP_BONUS_CREDITS = 50

export async function POST(req: NextRequest) {
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

  const current = userRow.credit_balance ?? 0
  if (current > 0) {
    return NextResponse.json({ message: 'Bonus already applied or credits exist', balance: current })
  }

  const { data: existingBonus } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', 'signup_bonus')
    .limit(1)
    .maybeSingle()

  if (existingBonus) {
    return NextResponse.json({ message: 'Signup bonus already applied', balance: current })
  }

  const newBalance = current + SIGNUP_BONUS_CREDITS

  const { error: updateError } = await supabase
    .from('users')
    .update({ credit_balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await supabase.from('credit_transactions').insert({
    user_id: user.id,
    amount: SIGNUP_BONUS_CREDITS,
    balance_after: newBalance,
    type: 'signup_bonus',
    reference_id: null,
    metadata: {},
  })

  return NextResponse.json({ success: true, balance: newBalance, granted: SIGNUP_BONUS_CREDITS })
}
