import { useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X } from 'lucide-react'

interface ArrangedLoop {
  id: string
  name: string
  startTime: number
  duration: number
}

interface LoopArrangerProps {
  arrangedLoops: ArrangedLoop[]
  onLoopRemove: (loopId: string) => void
}

export function LoopArranger({ arrangedLoops, onLoopRemove }: LoopArrangerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawArrangement = () => {
      const width = canvas.width
      const height = canvas.height
      const totalDuration = Math.max(...arrangedLoops.map(loop => loop.startTime + loop.duration), 8)
      const pixelsPerSecond = width / totalDuration

      ctx.fillStyle = '#1f2937'
      ctx.fillRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = '#374151'
      for (let i = 0; i <= totalDuration; i++) {
        const x = i * pixelsPerSecond
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Draw loops
      arrangedLoops.forEach((loop, index) => {
        const y = index * 30
        const x = loop.startTime * pixelsPerSecond
        const loopWidth = loop.duration * pixelsPerSecond

        ctx.fillStyle = `hsl(${index * 30}, 70%, 60%)`
        ctx.fillRect(x, y, loopWidth, 25)

        ctx.fillStyle = '#ffffff'
        ctx.font = '12px Arial'
        ctx.fillText(loop.name, x + 5, y + 17)
      })
    }

    drawArrangement()
  }, [arrangedLoops])

  return (
    <Card className="bg-secondary border-primary neon-border-green mb-4">
      <CardHeader>
        <CardTitle className="text-white">Loop Arranger</CardTitle>
      </CardHeader>
      <CardContent>
        <canvas ref={canvasRef} width={800} height={300} className="w-full mb-4" />
        <div className="flex flex-wrap gap-2">
          {arrangedLoops.map((loop) => (
            <Button
              key={loop.id}
              variant="secondary"
              className="flex items-center space-x-2"
              onClick={() => onLoopRemove(loop.id)}
            >
              <span>{loop.name}</span>
              <X className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

