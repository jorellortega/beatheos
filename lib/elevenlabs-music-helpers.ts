export const ELEVENLABS_DEFAULT_MUSIC_LENGTH_MS = 120_000

const STYLE_TERM_ALIASES: Record<string, string> = {
  ratchet: 'high-energy party',
  gang: 'hard-hitting',
  gangsta: 'street-influenced',
  murder: 'intense',
  kill: 'aggressive',
  drug: 'gritty',
  explicit: 'edgy',
}

export function sanitizeMusicText(text: string): string {
  let result = text
  for (const [term, replacement] of Object.entries(STYLE_TERM_ALIASES)) {
    result = result.replace(new RegExp(`\\b${term}\\b`, 'gi'), replacement)
  }
  return result.replace(/\s+/g, ' ').trim()
}

function extractStyleTags(album: {
  description?: string | null
  genre?: string | null
  subgenre?: string | null
}): string {
  const parts = [album.genre, album.subgenre, album.description]
    .filter((value): value is string => !!value?.trim())
    .flatMap((value) =>
      value
        .split(/[,;|]/)
        .map((tag) => sanitizeMusicText(tag.trim()))
        .filter((tag) => tag.length > 0 && tag.length < 40)
    )

  return [...new Set(parts)].slice(0, 8).join(', ')
}

export function buildMusicPrompt(
  trackTitle: string,
  album: { title: string; description?: string | null; genre?: string | null; subgenre?: string | null },
  userNotes?: string | null
): string {
  const trackConcept = sanitizeMusicText(trackTitle)
  const styleTags = extractStyleTags(album)
  const cleanedNotes = userNotes?.trim() ? sanitizeMusicText(userNotes.trim()) : ''

  const parts = [
    'Instrumental only. No vocals. No singing. No lyrics.',
    'Create an original instrumental music production.',
    `Track concept inspired by the title "${trackConcept}".`,
  ]

  if (cleanedNotes) {
    parts.push(`Artist notes and creative direction: ${cleanedNotes}.`)
  }

  if (styleTags) {
    parts.push(`Musical style and mood: ${styleTags}.`)
  } else {
    parts.push('Musical style: modern hip-hop instrumental with polished studio production.')
  }

  parts.push(
    'Use drums, bass, synths, and melody only. Match tempo and energy to the track concept. Professional mix quality suitable for a commercial music release. Instrumental beat — no vocals.'
  )

  return parts.join(' ')
}

export function buildFallbackMusicPrompt(styleTags: string): string {
  const style = styleTags || 'trap, dark, energetic, bouncy, party'
  return [
    'Instrumental only. No vocals. No singing. No lyrics.',
    `Style: ${style}.`,
    'Dark atmospheric synths, punchy drums, deep 808 bass, club-ready energy, professional hip-hop production. Instrumental beat — no vocals.',
  ].join(' ')
}

export function isElevenLabsGeneratedAudioUrl(audioUrl?: string | null): boolean {
  return !!audioUrl?.includes('_elevenlabs_')
}
