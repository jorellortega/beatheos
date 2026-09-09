import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserFromRequest, isAdminOrCEO, getAISettings } from '@/lib/ai-api-helpers'
import {
  resolveOpenAIModel,
  resolveOpenAIVisionModel,
  resolveGptImageApiModel,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_VISION_MODEL,
  DEFAULT_GPT_IMAGE_MODEL,
} from '@/lib/openai-models'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Estimated provider $ cost per credit (from credits system: 25 credits ≈ $0.25). */
const USD_PER_CREDIT = 0.01

const AI_USAGE_TYPES = ['ai_cover', 'ai_lyrics', 'ai_album_titles'] as const
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022'
const ELEVENLABS_MUSIC_MODEL = 'music_v2'

function resolveConfiguredImageModel(settings: Record<string, string>): string {
  const imageModelKey = Object.keys(settings).find(
    (key) =>
      key.toLowerCase().includes('image') &&
      (key.toLowerCase().includes('model') || key.toLowerCase().includes('selected'))
  )

  const raw =
    (imageModelKey && settings[imageModelKey]) ||
    settings['image_model'] ||
    settings['images_selected_model'] ||
    settings['images_locked_model'] ||
    DEFAULT_GPT_IMAGE_MODEL

  if (raw.toLowerCase().includes('dall')) return 'dall-e-3'
  return resolveGptImageApiModel(raw)
}

function buildActionModels(settings: Record<string, string>) {
  const openaiChat = resolveOpenAIModel(settings['openai_model'], DEFAULT_OPENAI_MODEL)
  const openaiVision = resolveOpenAIVisionModel(settings['openai_model'] || DEFAULT_OPENAI_VISION_MODEL)
  const anthropic = settings['anthropic_model']?.trim() || DEFAULT_ANTHROPIC_MODEL
  const image = resolveConfiguredImageModel(settings)

  return {
    ai_cover: {
      primary: image,
      alternatives: [] as string[],
      provider: 'openai',
      note: 'From /ai-settings image model (default gpt-image-2).',
    },
    ai_lyrics: {
      primary: openaiChat,
      alternatives: [anthropic],
      provider: 'openai / anthropic',
      note: 'Uses openai_model or anthropic_model depending on the selected service.',
    },
    ai_album_titles: {
      primary: openaiVision,
      alternatives: [anthropic],
      provider: 'openai / anthropic',
      note: 'Uses vision-capable openai_model (falls back to gpt-5.6-terra), then Anthropic.',
    },
  } as const
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const allowed = await isAdminOrCEO(user.id)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(Number(searchParams.get('days') || 30), 1), 365)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const settings = await getAISettings()
  const actionModels = buildActionModels(settings)

  const { data: actions, error: actionsError } = await supabase
    .from('credit_actions')
    .select('action_key, credits_cost, description')
    .order('action_key')

  if (actionsError) {
    return NextResponse.json({ error: actionsError.message }, { status: 500 })
  }

  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('id, user_id, amount, balance_after, type, reference_id, created_at')
    .in('type', [...AI_USAGE_TYPES])
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(500)

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 })
  }

  const rows = transactions ?? []
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]

  let usersById: Record<string, { username: string | null; email: string | null }> = {}
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, username, email')
      .in('id', userIds)

    usersById = (users ?? []).reduce((acc, u) => {
      acc[u.id] = { username: u.username ?? null, email: u.email ?? null }
      return acc
    }, {} as Record<string, { username: string | null; email: string | null }>)
  }

  const byAction: Record<
    string,
    { count: number; credits: number; estimated_usd: number }
  > = {}

  for (const key of AI_USAGE_TYPES) {
    byAction[key] = { count: 0, credits: 0, estimated_usd: 0 }
  }

  for (const row of rows) {
    const key = row.type
    if (!byAction[key]) {
      byAction[key] = { count: 0, credits: 0, estimated_usd: 0 }
    }
    const creditsUsed = Math.abs(Number(row.amount) || 0)
    byAction[key].count += 1
    byAction[key].credits += creditsUsed
    byAction[key].estimated_usd += creditsUsed * USD_PER_CREDIT
  }

  const totals = Object.values(byAction).reduce(
    (acc, item) => {
      acc.count += item.count
      acc.credits += item.credits
      acc.estimated_usd += item.estimated_usd
      return acc
    },
    { count: 0, credits: 0, estimated_usd: 0 }
  )

  const actionCosts = (actions ?? []).map((action) => {
    const models =
      actionModels[action.action_key as keyof typeof actionModels] || null
    return {
      action_key: action.action_key,
      credits_cost: action.credits_cost,
      description: action.description,
      estimated_usd: Number(action.credits_cost) * USD_PER_CREDIT,
      model: models?.primary ?? null,
      models: models
        ? [models.primary, ...models.alternatives].filter(Boolean)
        : [],
      provider: models?.provider ?? null,
      model_note: models?.note ?? null,
    }
  })

  const recent = rows.slice(0, 100).map((row) => {
    const creditsUsed = Math.abs(Number(row.amount) || 0)
    const profile = usersById[row.user_id] || { username: null, email: null }
    const models = actionModels[row.type as keyof typeof actionModels]
    return {
      id: row.id,
      type: row.type,
      credits: creditsUsed,
      estimated_usd: creditsUsed * USD_PER_CREDIT,
      model: models?.primary ?? null,
      user_id: row.user_id,
      username: profile.username,
      email: profile.email,
      reference_id: row.reference_id,
      created_at: row.created_at,
    }
  })

  return NextResponse.json({
    usd_per_credit: USD_PER_CREDIT,
    days,
    since: since.toISOString(),
    configuredModels: {
      openai_model: settings['openai_model'] || DEFAULT_OPENAI_MODEL,
      openai_chat_resolved: actionModels.ai_lyrics.primary,
      openai_vision_resolved: actionModels.ai_album_titles.primary,
      image_model: actionModels.ai_cover.primary,
      anthropic_model: settings['anthropic_model']?.trim() || DEFAULT_ANTHROPIC_MODEL,
      elevenlabs_music_model: ELEVENLABS_MUSIC_MODEL,
    },
    actionCosts,
    usage: {
      byAction,
      totals,
    },
    recent,
    notes: [
      'Estimated USD uses the credits cost basis (1 credit ≈ $0.01 provider cost).',
      'User-facing credit packs include markup; this page shows estimated provider cost, not retail credit price.',
      'Models shown are the currently configured platform models from /ai-settings (resolved defaults applied).',
      'ElevenLabs instrumental generation is not deducted from credits yet, so it will not appear in usage totals.',
    ],
  })
}
