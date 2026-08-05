import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_ACTIONS = ['ai_cover', 'ai_lyrics', 'ai_album_titles'] as const
export type CreditAction = typeof VALID_ACTIONS[number]

export interface DeductResult {
  success: true
  balance_after: number
  deducted: number
}
export interface DeductError {
  success: false
  error: string
  balance?: number
  required?: number
}

export async function deductCredits(
  userId: string,
  action: CreditAction,
  referenceId?: string
): Promise<DeductResult | DeductError> {
  const { data: actionRow, error: actionError } = await supabase
    .from('credit_actions')
    .select('credits_cost')
    .eq('action_key', action)
    .single()

  if (actionError || !actionRow) {
    return { success: false, error: 'Unknown action' }
  }

  const cost = actionRow.credits_cost
  if (cost <= 0) {
    return { success: false, error: 'Invalid cost' }
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('credit_balance')
    .eq('id', userId)
    .single()

  if (userError || !userRow) {
    return { success: false, error: 'User not found' }
  }

  const current = userRow.credit_balance ?? 0
  if (current < cost) {
    return { success: false, error: 'Insufficient credits', balance: current, required: cost }
  }

  const newBalance = current - cost

  const { error: updateError } = await supabase
    .from('users')
    .update({ credit_balance: newBalance })
    .eq('id', userId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: -cost,
    balance_after: newBalance,
    type: action,
    reference_id: referenceId ?? null,
    metadata: {},
  })

  return { success: true, balance_after: newBalance, deducted: cost }
}
