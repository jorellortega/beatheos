import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/ai-api-helpers'
import { deductCredits, type CreditAction } from '@/lib/credits'

const VALID_ACTIONS = ['ai_cover', 'ai_lyrics', 'ai_album_titles'] as const

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { action, reference_id } = body as { action?: string; reference_id?: string }

  if (!action || !VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number])) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 }
    )
  }

  const result = await deductCredits(user.id, action as CreditAction, reference_id)

  if (!result.success) {
    const status = result.error === 'Insufficient credits' ? 402 : 400
    return NextResponse.json(
      { error: result.error, balance: result.balance, required: result.required },
      { status }
    )
  }

  return NextResponse.json({
    success: true,
    balance_after: result.balance_after,
    deducted: result.deducted,
  })
}
