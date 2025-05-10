import { useRef, useEffect } from 'react'

export function Sequencer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawSequencer = () => {
      const width = canvas.width
      const height = canvas.height
      const numTracks = 4
      const numSteps = 16

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      const stepWidth = width / numSteps
      const trackHeight = height / numTracks

      // Draw grid
      ctx.strokeStyle = '#374151'
      for (let i = 0; i <= numSteps; i++) {
        ctx.beginPath()
        ctx.moveTo(i * stepWidth, 0)
        ctx.lineTo(i * stepWidth, height)
        ctx.stroke()
      }
      for (let i = 0; i <= numTracks; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * trackHeight)
        ctx.lineTo(width, i * trackHeight)
        ctx.stroke()
      }

      // Draw some sample steps
      ctx.fillStyle = '#10b981'
      ctx.fillRect(stepWidth * 0, trackHeight * 0, stepWidth, trackHeight)
      ctx.fillRect(stepWidth * 4, trackHeight * 1, stepWidth, trackHeight)
      ctx.fillRect(stepWidth * 8, trackHeight * 2, stepWidth, trackHeight)
      ctx.fillRect(stepWidth * 12, trackHeight * 3, stepWidth, trackHeight)
    }

    drawSequencer()
  }, [])

  return (
    <div className="bg-card rounded-lg p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Sequencer</h2>
      <canvas ref={canvasRef} width={800} height={200} className="w-full" />
    </div>
  )
}

