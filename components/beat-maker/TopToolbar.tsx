import { Button } from "@/components/ui/button"
import { Play, Pause, Square, Mic, Undo, Redo, ZoomIn, ZoomOut } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TopToolbarProps {
  onPlay: () => void
  onStop: () => void
  onRecord: () => void
  isPlaying: boolean
  isRecording: boolean
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
}

export function TopToolbar({
  onPlay,
  onStop,
  onRecord,
  isPlaying,
  isRecording,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut
}: TopToolbarProps) {
  return (
    <div className="flex items-center space-x-2 mb-4 bg-secondary p-2 rounded-lg">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={isPlaying ? onStop : onPlay} variant="outline">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPlaying ? 'Pause' : 'Play'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onStop} variant="outline">
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Stop</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onRecord} variant="outline" className={isRecording ? "bg-red-500" : ""}>
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Record</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="border-l border-gray-600 h-6 mx-2" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onUndo} variant="outline">
              <Undo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onRedo} variant="outline">
              <Redo className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="border-l border-gray-600 h-6 mx-2" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onZoomIn} variant="outline">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom In</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onZoomOut} variant="outline">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Zoom Out</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

