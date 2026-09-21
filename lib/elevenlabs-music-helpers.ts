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

const MAX_LYRICS_CHARS_IN_PROMPT = 3500

function truncateLyricsForPrompt(lyrics: string): string {
  const trimmed = lyrics.trim()
  if (trimmed.length <= MAX_LYRICS_CHARS_IN_PROMPT) return trimmed
  return `${trimmed.slice(0, MAX_LYRICS_CHARS_IN_PROMPT).trim()}\n\n[lyrics truncated for generation]`
}

/** Build an ElevenLabs Music prompt for a full song (vocals + lyrics or instrumental). */
export function buildSongWithLyricsPrompt(opts: {
  title: string
  styleNotes?: string | null
  lyricsText?: string | null
  genre?: string | null
  mood?: string | null
  instrumental?: boolean
}): string {
  const title = sanitizeMusicText(opts.title || 'Untitled Song')
  const styleNotes = opts.styleNotes?.trim() ? sanitizeMusicText(opts.styleNotes.trim()) : ''
  const genre = opts.genre?.trim() ? sanitizeMusicText(opts.genre.trim()) : ''
  const mood = opts.mood?.trim() ? sanitizeMusicText(opts.mood.trim()) : ''
  const lyrics = opts.lyricsText?.trim() ? truncateLyricsForPrompt(opts.lyricsText) : ''
  const instrumental = opts.instrumental === true

  if (instrumental) {
    const parts = [
      'Instrumental only. No vocals. No singing. No lyrics.',
      'Create an original instrumental music production.',
      `Track concept inspired by the title "${title}".`,
    ]
    if (styleNotes) parts.push(`Artist notes and creative direction: ${styleNotes}.`)
    if (genre || mood) {
      parts.push(`Musical style and mood: ${[genre, mood].filter(Boolean).join(', ')}.`)
    } else {
      parts.push('Musical style: modern polished studio production.')
    }
    parts.push(
      'Use drums, bass, synths, and melody only. Professional mix quality suitable for a commercial music release. Instrumental beat — no vocals.'
    )
    return parts.join(' ')
  }

  const parts = [
    `Create an original song titled "${title}" with clear lead vocals singing the lyrics provided.`,
    'Include melody, harmony, drums, bass, and supporting instruments that fit the lyrics and style.',
  ]

  if (styleNotes) parts.push(`Style and creative direction: ${styleNotes}.`)
  if (genre || mood) {
    parts.push(`Genre and mood: ${[genre, mood].filter(Boolean).join(', ')}.`)
  } else {
    parts.push('Genre and mood: modern studio-quality songwriting and production.')
  }

  if (lyrics) {
    parts.push(
      'Perform these lyrics clearly with natural phrasing and matching melody. Preserve section markers like [Verse], [Chorus], [Bridge] if present.'
    )
    parts.push(`Lyrics:\n${lyrics}`)
  } else {
    parts.push('Write and perform original vocals and lyrics that fit the title and style.')
  }

  parts.push('Professional commercial mix quality suitable for a music release.')

  return parts.join('\n\n')
}

export function buildFallbackSongPrompt(opts: {
  title: string
  genre?: string | null
  mood?: string | null
  instrumental?: boolean
}): string {
  const title = sanitizeMusicText(opts.title || 'Untitled Song')
  const style = [opts.genre, opts.mood]
    .filter((value): value is string => !!value?.trim())
    .map((value) => sanitizeMusicText(value.trim()))
    .join(', ') || 'modern, polished, emotional'

  if (opts.instrumental) {
    return buildFallbackMusicPrompt(style)
  }

  return [
    `Create an original song inspired by the title "${title}".`,
    `Style: ${style}.`,
    'Include clear lead vocals, melody, and full band/production arrangement. Clean commercial mix.',
  ].join(' ')
}
