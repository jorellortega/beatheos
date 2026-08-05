/** Wrap raw 16-bit PCM in a WAV container (RIFF header). */
export function pcm16ToWav(
  pcm: ArrayBuffer | Buffer,
  options: {
    sampleRate?: number
    channels?: number
  } = {}
): Buffer {
  const sampleRate = options.sampleRate ?? 48000
  const channels = options.channels ?? 2
  const bitsPerSample = 16

  const pcmBuffer = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm)
  const byteRate = (sampleRate * channels * bitsPerSample) / 8
  const blockAlign = (channels * bitsPerSample) / 8
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcmBuffer.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(channels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcmBuffer.length, 40)

  return Buffer.concat([header, pcmBuffer])
}
