/** ElevenLabs Music concurrent generation limits by plan (approx.):
 *  Starter / Creator / Pro: 2
 *  Scale / Business: 3
 *  Enterprise: custom (set NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC)
 */
export const ELEVENLABS_MAX_CONCURRENT_MUSIC = Number(
  process.env.NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC || 2
)

/** ElevenLabs music output format — pcm_48000 is converted to WAV for storage. */
export const ELEVENLABS_MUSIC_OUTPUT_FORMAT =
  process.env.ELEVENLABS_MUSIC_OUTPUT_FORMAT || 'pcm_48000'

export const ELEVENLABS_MUSIC_PCM_SAMPLE_RATE = 48000
export const ELEVENLABS_MUSIC_PCM_CHANNELS = 2
