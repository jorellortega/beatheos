import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface EQPanelProps {
  isOpen: boolean
  onClose: () => void
  trackName: string
  eq: {
    low: number
    mid: number
    high: number
  }
  onEQChange: (band: 'low' | 'mid' | 'high', value: number) => void
}

export function EQPanel({ isOpen, onClose, trackName, eq, onEQChange }: EQPanelProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-96 bg-[#141414] border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">EQ - {trackName}</CardTitle>
            <div className="text-gray-400 text-xs mt-1">Jorell Ortega EQ</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Low Band */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm font-medium">Low</span>
              <span className="text-gray-400 text-sm">{eq.low > 0 ? `+${eq.low}` : eq.low}dB</span>
            </div>
                          <Slider
                value={[eq.low]}
                onValueChange={(value) => {
                  console.log(`[EQ PANEL] Low band changed to ${value[0]}dB`)
                  onEQChange('low', value[0])
                }}
                min={-12}
                max={12}
                step={0.5}
                className="mb-2"
              />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-12dB</span>
              <span>0dB</span>
              <span>+12dB</span>
            </div>
          </div>

          {/* Mid Band */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm font-medium">Mid</span>
              <span className="text-gray-400 text-sm">{eq.mid > 0 ? `+${eq.mid}` : eq.mid}dB</span>
            </div>
                          <Slider
                value={[eq.mid]}
                onValueChange={(value) => {
                  console.log(`[EQ PANEL] Mid band changed to ${value[0]}dB`)
                  onEQChange('mid', value[0])
                }}
                min={-12}
                max={12}
                step={0.5}
                className="mb-2"
              />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-12dB</span>
              <span>0dB</span>
              <span>+12dB</span>
            </div>
          </div>

          {/* High Band */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-white text-sm font-medium">High</span>
              <span className="text-gray-400 text-sm">{eq.high > 0 ? `+${eq.high}` : eq.high}dB</span>
            </div>
                          <Slider
                value={[eq.high]}
                onValueChange={(value) => {
                  console.log(`[EQ PANEL] High band changed to ${value[0]}dB`)
                  onEQChange('high', value[0])
                }}
                min={-12}
                max={12}
                step={0.5}
                className="mb-2"
              />
            <div className="flex justify-between text-xs text-gray-500">
              <span>-12dB</span>
              <span>0dB</span>
              <span>+12dB</span>
            </div>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            onClick={() => {
              onEQChange('low', 0)
              onEQChange('mid', 0)
              onEQChange('high', 0)
            }}
            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Reset EQ
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 