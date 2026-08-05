/** ElevenLabs Music concurrent generation limits by plan (approx.):
 *  Starter / Creator / Pro: 2
 *  Scale / Business: 3
 *  Enterprise: custom (set NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC)
 */
export const ELEVENLABS_MAX_CONCURRENT_MUSIC = Number(
  process.env.NEXT_PUBLIC_ELEVENLABS_MAX_CONCURRENT_MUSIC || 2
)
