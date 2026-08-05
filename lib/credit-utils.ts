export function formatCreditsError(
  data: {
    error?: string
    balance?: number
    required?: number
    hint?: string
    debug?: { keyPath?: string; openaiKeyPath?: string; provider?: string }
  },
  fallback = 'Request failed'
): string {
  if (data.error === 'Insufficient credits') {
    return `You need ${data.required ?? '?'} Beatheos credits (you have ${data.balance ?? 0}). ${data.hint || 'Visit /credits or add your API key in /setup-ai.'}`
  }
  if (data.hint && data.error) {
    return `${data.error}. ${data.hint}`
  }
  if (data.debug?.keyPath && data.error) {
    return `${data.error} (key from: ${data.debug.keyPath})`
  }
  return data.error || data.hint || fallback
}
