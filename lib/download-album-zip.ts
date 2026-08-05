import JSZip from 'jszip'

export function sanitizeDownloadFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim() || 'untitled'
}

export function getFileExtension(url: string, fallback = 'wav'): string {
  const path = url.split('?')[0]
  const ext = path.split('.').pop()?.toLowerCase()
  return ext && ext.length <= 5 ? ext : fallback
}

export async function buildAlbumZip(params: {
  albumTitle: string
  coverArtUrl?: string | null
  tracks: { title: string; audio_url: string }[]
}): Promise<Blob> {
  const zip = new JSZip()
  const folderName = sanitizeDownloadFilename(params.albumTitle)
  const folder = zip.folder(folderName)
  if (!folder) {
    throw new Error('Failed to create album folder in zip')
  }

  if (params.coverArtUrl) {
    try {
      const coverResponse = await fetch(params.coverArtUrl)
      if (coverResponse.ok) {
        const coverBlob = await coverResponse.blob()
        const ext = getFileExtension(params.coverArtUrl, 'jpg')
        folder.file(`cover.${ext}`, coverBlob)
      }
    } catch (error) {
      console.warn('Failed to add cover art to album zip:', error)
    }
  }

  const usedNames = new Set<string>()
  let addedTracks = 0

  for (let i = 0; i < params.tracks.length; i++) {
    const track = params.tracks[i]
    if (!track.audio_url) continue

    try {
      const response = await fetch(track.audio_url)
      if (!response.ok) {
        console.warn(`Failed to fetch track: ${track.title}`)
        continue
      }

      const blob = await response.blob()
      const ext = getFileExtension(track.audio_url, 'wav')
      const baseName = sanitizeDownloadFilename(track.title)
      let fileName = `${baseName}.${ext}`

      if (usedNames.has(fileName)) {
        fileName = `${String(i + 1).padStart(2, '0')} - ${baseName}.${ext}`
      }

      usedNames.add(fileName)
      folder.file(fileName, blob)
      addedTracks++
    } catch (error) {
      console.warn(`Failed to add track to zip: ${track.title}`, error)
    }
  }

  if (addedTracks === 0 && !params.coverArtUrl) {
    throw new Error('No files could be added to the album download')
  }

  return zip.generateAsync({ type: 'blob' })
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
