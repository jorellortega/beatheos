/** ElevenLabs Music concurrent generation limits by plan (approx.):
 *  Starter / Creator / Pro: 2
 *  Scale / Business: 3
 *  Enterprise: custom (set NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC)
 */
export const ELEVENLABS_MAX_CONCURRENT_MUSIC = Number(
  process.env.NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC || 2
)

/** Default MP3 works on all plans; set ELEVENLABS_MUSIC_OUTPUT_FORMAT=pcm_48000 for WAV (Pro+). */
export const ELEVENLABS_MUSIC_OUTPUT_FORMAT =
  process.env.ELEVENLABS_MUSIC_OUTPUT_FORMAT || 'mp3_48000_192'

export const ELEVENLABS_MUSIC_MP3_FALLBACK_FORMAT = 'mp3_48000_192'

export const ELEVENLABS_MUSIC_PCM_SAMPLE_RATE = 48000
export const ELEVENLABS_MUSIC_PCM_CHANNELS = 2
