import { useRef, useEffect } from 'react'

interface Track {
  id: string
  name: string
  clips: any[] // TODO: Define proper clip type
}

interface TrackEditorProps {
  tracks: Track[]
  // TODO: Add props for clip editing functions
}

export function TrackEditor({ tracks }: TrackEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawTimeline = () => {
      const width = canvas.width
      const height = canvas.height
      const trackHeight = height / Math.max(tracks.length, 1)

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      // Draw track separators
      ctx.strokeStyle = '#374151'
      tracks.forEach((_, index) => {
        const y = index * trackHeight
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      })

      // TODO: Draw clips
    }

    drawTimeline()
  }, [tracks])

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={200}
      className="w-full bg-secondary rounded-lg mt-4"
    />
  )
}

