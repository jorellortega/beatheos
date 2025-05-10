import { useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { X } from 'lucide-react'

interface ArrangementViewProps {
  selectedLoops: string[]
  onLoopRemove: (loopId: string) => void
}

const mockLoops = {
  '1': { color: '#10B981', name: 'Funky Guitar' },
  '2': { color: '#3B82F6', name: 'Deep Bass' },
  '3': { color: '#EF4444', name: 'Snare Roll' },
  '4': { color: '#8B5CF6', name: 'Synth Pad' },
  '5': { color: '#F59E0B', name: 'Hi-Hat Groove' },
  '6': { color: '#EC4899', name: 'Vocal Chop' },
  '7': { color: '#6EE7B7', name: 'Ambient Texture' },
  '8': { color: '#1D4ED8', name: 'Trap 808' },
}

export function ArrangementView({ selectedLoops, onLoopRemove }: ArrangementViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawArrangement = () => {
      const width = canvas.width
      const height = canvas.height
      const numTracks = Math.max(8, selectedLoops.length)
      const trackHeight = height / numTracks

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = '#374151'
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, height)
        ctx.stroke()
      }
      for (let i = 0; i <= numTracks; i++) {
        ctx.beginPath()
        ctx.moveTo(0, i * trackHeight)
        ctx.lineTo(width, i * trackHeight)
        ctx.stroke()
      }

      // Draw loops
      selectedLoops.forEach((loopId, index) => {
        const loop = mockLoops[loopId as keyof typeof mockLoops]
        if (loop) {
          ctx.fillStyle = loop.color
          ctx.fillRect(0, index * trackHeight, 100, trackHeight - 2)
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px Arial'
          ctx.fillText(loop.name, 5, (index + 0.5) * trackHeight)
        }
      })
    }

    drawArrangement()
  }, [selectedLoops])

  return (
    <div className="bg-card rounded-lg p-4 mb-4">
      <h2 className="text-xl font-semibold mb-4">Arrangement</h2>
      <canvas ref={canvasRef} width={800} height={400} className="w-full mb-4" />
      <div className="flex flex-wrap gap-2">
        {selectedLoops.map((loopId) => {
          const loop = mockLoops[loopId as keyof typeof mockLoops]
          return (
            <Button
              key={loopId}
              variant="secondary"
              className="flex items-center space-x-2"
              onClick={() => onLoopRemove(loopId)}
            >
              <span>{loop.name}</span>
              <X className="h-4 w-4" />
            </Button>
          )
        })}
      </div>
    </div>
  )
}

