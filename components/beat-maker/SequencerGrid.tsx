import { useRef, useEffect } from 'react'

interface Track {
  id: string
  name: string
  steps: boolean[]
}

interface SequencerGridProps {
  tracks: Track[]
  onToggleStep: (trackId: string, stepIndex: number) => void
}

export function SequencerGrid({ tracks, onToggleStep }: SequencerGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawGrid = () => {
      const width = canvas.width
      const height = canvas.height
      const numSteps = 16
      const stepWidth = width / numSteps
      const trackHeight = height / Math.max(tracks.length, 1)

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      // Draw grid lines
      ctx.strokeStyle = '#374151'
      for (let i = 0; i <= numSteps; i++) {
        ctx.beginPath()
        ctx.moveTo(i * stepWidth, 0)
        ctx.lineTo(i * stepWidth, height)
        ctx.stroke()
      }
      for (let i = 0; i <= tracks.length; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * trackHeight)
        ctx.lineTo(width, i * trackHeight)
        ctx.stroke()
      }

      // Draw active steps
      tracks.forEach((track, trackIndex) => {
        track.steps.forEach((isActive, stepIndex) => {
          if (isActive) {
            ctx.fillStyle = '#10b981'
            ctx.fillRect(
              stepIndex * stepWidth,
              trackIndex * trackHeight,
              stepWidth,
              trackHeight
            )
          }
        })
      })

      // Draw beat markers
      ctx.fillStyle = '#6b7280'
      for (let i = 0; i < numSteps; i += 4) {
        ctx.fillRect(i * stepWidth, 0, 2, height)
      }
    }

    drawGrid()
  }, [tracks])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const stepIndex = Math.floor((x / canvas.width) * 16)
    const trackIndex = Math.floor((y / canvas.height) * tracks.length)

    if (trackIndex >= 0 && trackIndex < tracks.length) {
      onToggleStep(tracks[trackIndex].id, stepIndex)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="w-full cursor-pointer bg-secondary rounded-lg"
      onClick={handleCanvasClick}
    />
  )
}

