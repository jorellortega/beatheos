/** Cost-efficient default (replaces gpt-4o-mini). */
export const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna'

/** Balanced default for vision and higher-quality text (replaces gpt-4o). */
export const DEFAULT_OPENAI_VISION_MODEL = 'gpt-5.6-terra'

/** Mainline model for Responses API image_generation tool. */
export const DEFAULT_OPENAI_IMAGE_MAINLINE_MODEL = 'gpt-5.6-terra'

/** Direct Images API model (GPT Image 2). */
export const DEFAULT_GPT_IMAGE_MODEL = 'gpt-image-2'

export const OPENAI_CHAT_MODELS = [
  'gpt-5.6-sol',
  'gpt-5.6',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
  'gpt-5.4',
  'gpt-5.4-pro',
] as const

export const OPENAI_IMAGE_MODELS = [
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
] as const

const LEGACY_OPENAI_MODEL_ALIASES: Record<string, string> = {
  'gpt-4o-mini': DEFAULT_OPENAI_MODEL,
  'gpt-4o': DEFAULT_OPENAI_VISION_MODEL,
  'gpt-4-turbo': DEFAULT_OPENAI_VISION_MODEL,
  'gpt-4': DEFAULT_OPENAI_VISION_MODEL,
  'gpt-3.5-turbo': DEFAULT_OPENAI_MODEL,
  'gpt-4.1-mini': DEFAULT_OPENAI_IMAGE_MAINLINE_MODEL,
  'gpt-image-1': DEFAULT_GPT_IMAGE_MODEL,
}

export function resolveOpenAIModel(
  model?: string | null,
  fallback: string = DEFAULT_OPENAI_MODEL
): string {
  const trimmed = model?.trim()
  if (!trimmed) return fallback
  return LEGACY_OPENAI_MODEL_ALIASES[trimmed] ?? trimmed
}

export function buildOpenAITokenLimit(model: string, limit: number): Record<string, number> {
  const normalized = model.toLowerCase()
  const usesMaxCompletionTokens =
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')

  if (usesMaxCompletionTokens) {
    return { max_completion_tokens: limit }
  }
  return { max_tokens: limit }
}

/** GPT-5 and reasoning models only support the default temperature (1) — omit the param. */
export function buildOpenAITemperature(model: string, temperature?: number): Record<string, number> {
  const normalized = model.toLowerCase()
  const fixedTemperature =
    normalized.startsWith('gpt-5') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')

  if (fixedTemperature || temperature === undefined) {
    return {}
  }
  return { temperature }
}

/** Text-only / cost-efficient models — not used for vision; map to terra instead. */
const OPENAI_TEXT_ONLY_MODELS = new Set([
  DEFAULT_OPENAI_MODEL,
  'gpt-5.6-luna',
  'gpt-5.6-sol',
  'gpt-3.5-turbo',
])

export function resolveOpenAIVisionModel(model?: string | null): string {
  const candidate = resolveOpenAIModel(model, DEFAULT_OPENAI_VISION_MODEL)
  if (OPENAI_TEXT_ONLY_MODELS.has(candidate)) {
    return DEFAULT_OPENAI_VISION_MODEL
  }
  return candidate
}

export function isGptImageModelId(model: string): boolean {
  return model === 'gpt-image-1' || model.startsWith('gpt-image-')
}

export function resolveGptImageApiModel(model?: string | null): string {
  const trimmed = model?.trim()
  if (!trimmed || trimmed === 'gpt-image-1') return DEFAULT_GPT_IMAGE_MODEL
  if (isGptImageModelId(trimmed)) return trimmed
  return DEFAULT_GPT_IMAGE_MODEL
}

export function resolveOpenAIImageMainlineModel(model?: string | null): string {
  const trimmed = model?.trim()
  if (!trimmed || isGptImageModelId(trimmed)) {
    return DEFAULT_OPENAI_IMAGE_MAINLINE_MODEL
  }
  if (trimmed.startsWith('gpt-5')) return trimmed
  return LEGACY_OPENAI_MODEL_ALIASES[trimmed] ?? DEFAULT_OPENAI_IMAGE_MAINLINE_MODEL
}
