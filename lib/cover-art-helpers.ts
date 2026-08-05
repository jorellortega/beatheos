import type { SupabaseClient } from '@supabase/supabase-js'

const COVER_TERM_ALIASES: Record<string, string> = {
  ratchet: 'high-energy party',
  gang: 'hard-hitting',
  gangsta: 'street-influenced',
  explicit: 'edgy',
  sexy: 'bold',
  sexual: 'bold',
}

export function sanitizeCoverPromptText(text: string): string {
  let result = text
  for (const [term, replacement] of Object.entries(COVER_TERM_ALIASES)) {
    result = result.replace(new RegExp(`\\b${term}\\b`, 'gi'), replacement)
  }
  return result.replace(/\s+/g, ' ').trim()
}

export const MAX_COVER_REFERENCE_IMAGES = 16

export const COVER_ART_TEXT_RULE =
  'No extra text — only the album title and artist names.'

export function buildCoverReferencePromptHint(imageCount: number): string {
  if (imageCount <= 0) return ''
  const labels = Array.from({ length: imageCount }, (_, index) => `Image ${index + 1}`)
  return `Use the uploaded reference image(s) (${labels.join(', ')}) for style, mood, composition, colors, and visual elements as described.`
}

export function appendCoverArtTextRule(prompt: string): string {
  const trimmed = prompt.trim()
  if (!trimmed) return COVER_ART_TEXT_RULE
  if (trimmed.toLowerCase().includes('no extra text')) return trimmed
  return `${trimmed} ${COVER_ART_TEXT_RULE}`
}

export function buildEditCoverPrompt(
  changeDescription: string,
  albumTitle: string,
  artist?: string | null
): string {
  const title = sanitizeCoverPromptText(albumTitle)
  const artistName = artist?.trim() || 'Unknown Artist'
  return `Edit this album cover for "${title}" by ${artistName}. Use the attached image as reference — keep the same overall style, layout, and visual identity unless the changes below require otherwise. Changes to apply: ${changeDescription.trim()}`
}

export interface AdditionalCover {
  label: string
  url: string
  thumb_url?: string
}

export function getBeatsStoragePath(publicUrl: string): string | null {
  const marker = '/storage/v1/object/public/beats/'
  const index = publicUrl.indexOf(marker)
  if (index === -1) return null
  return decodeURIComponent(publicUrl.slice(index + marker.length).split('?')[0])
}

export async function deleteCoverStorageFiles(
  supabase: SupabaseClient,
  cover: { url: string; thumb_url?: string }
): Promise<void> {
  const paths = [cover.url, cover.thumb_url]
    .filter((url): url is string => !!url)
    .map(getBeatsStoragePath)
    .filter((path): path is string => !!path)

  const uniquePaths = [...new Set(paths)]
  if (uniquePaths.length === 0) return

  const { error } = await supabase.storage.from('beats').remove(uniquePaths)
  if (error) {
    console.warn('Failed to delete cover files from storage:', error)
  }
}

export async function createThumbnailBlob(source: Blob | string, maxSize = 200): Promise<Blob> {
  const blob = typeof source === 'string'
    ? await (await fetch(source)).blob()
    : source

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = typeof source === 'string' ? source : URL.createObjectURL(blob)

    img.onload = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(objectUrl)
      }

      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1)
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (thumb) => (thumb ? resolve(thumb) : reject(new Error('Failed to create thumbnail'))),
        'image/jpeg',
        0.85
      )
    }

    img.onerror = () => {
      if (typeof source !== 'string') {
        URL.revokeObjectURL(objectUrl)
      }
      reject(new Error('Failed to load image for thumbnail'))
    }

    img.crossOrigin = 'anonymous'
    img.src = objectUrl
  })
}

export async function uploadCoverThumbnail(
  supabase: SupabaseClient,
  albumId: string,
  thumbnailBlob: Blob
): Promise<string> {
  const filePath = `albums/${albumId}/thumbs/${Date.now()}_thumb.jpg`
  const { error: uploadError } = await supabase.storage
    .from('beats')
    .upload(filePath, thumbnailBlob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: { publicUrl } } = supabase.storage.from('beats').getPublicUrl(filePath)
  return publicUrl
}

export async function preserveCoverToHistory(params: {
  supabase: SupabaseClient
  albumId: string
  coverUrl: string
  existingAdditionalCovers: AdditionalCover[]
  label?: string
}): Promise<{ additionalCovers: AdditionalCover[] }> {
  const { supabase, albumId, coverUrl, existingAdditionalCovers, label } = params

  if (!coverUrl || existingAdditionalCovers.some((cover) => cover.url === coverUrl)) {
    return { additionalCovers: existingAdditionalCovers }
  }

  let thumbUrl: string | undefined
  try {
    const thumbBlob = await createThumbnailBlob(coverUrl, 200)
    thumbUrl = await uploadCoverThumbnail(supabase, albumId, thumbBlob)
  } catch (error) {
    console.warn('Failed to create cover thumbnail, using full image:', error)
  }

  const coverLabel = label || `Cover ${new Date().toLocaleDateString()}`
  const newEntry: AdditionalCover = {
    label: coverLabel,
    url: coverUrl,
    ...(thumbUrl ? { thumb_url: thumbUrl } : {}),
  }

  return {
    additionalCovers: [...existingAdditionalCovers, newEntry],
  }
}
