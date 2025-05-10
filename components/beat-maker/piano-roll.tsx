import { useRef, useEffect } from 'react'

export function PianoRoll() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawPianoRoll = () => {
      const width = canvas.width
      const height = canvas.height
      const numKeys = 88
      const keyHeight = height / numKeys

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < numKeys; i++) {
        if (i % 12 === 1 || i % 12 === 3 || i % 12 === 6 || i % 12 === 8 || i % 12 === 10) {
          ctx.fillStyle = '#4b5563'
        } else {
          ctx.fillStyle = '#6b7280'
        }
        ctx.fillRect(0, i * keyHeight, 40, keyHeight)
        ctx.strokeStyle = '#374151'
        ctx.strokeRect(0, i * keyHeight, 40, keyHeight)
      }

      // Draw grid
      ctx.strokeStyle = '#374151'
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, height)
        ctx.stroke()
      }
    }

    drawPianoRoll()
  }, [])

  return (
    <div className="bg-card rounded-lg p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Piano Roll</h2>
      <canvas ref={canvasRef} width={800} height={300} className="w-full" />
    </div>
  )
}

