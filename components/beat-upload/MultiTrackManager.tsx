import { Button } from "@/components/ui/button"
import { Copy, Plus, Repeat } from 'lucide-react'

interface Track {
  id: number
  beatDetails: {
    title: string
    description: string
    tags: string[]
    bpm: string
    key: string
  }
  files: {
    mp3: File | null
    wav: File | null
    stems: File | null
    coverArt: File | null
  }
  licensing: Record<string, number>
}

interface MultiTrackManagerProps {
  tracks: Track[]
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>
  currentTrackIndex: number
}

export function MultiTrackManager({ tracks, setTracks, currentTrackIndex }: MultiTrackManagerProps) {
  const duplicateTrack = () => {
    const newTrack = { ...tracks[currentTrackIndex], id: Date.now() }
    setTracks([...tracks, newTrack])
  }

  const copyFromPrevious = () => {
    if (currentTrackIndex > 0) {
      const newTrack = { ...tracks[currentTrackIndex - 1], id: Date.now() }
      setTracks([...tracks, newTrack])
    }
  }

  const addNewTrack = () => {
    const newTrack: Track = {
      id: Date.now(),
      beatDetails: {
        title: '',
        description: '',
        tags: [],
        bpm: '',
        key: '',
      },
      files: {
        mp3: null,
        wav: null,
        stems: null,
        coverArt: null,
      },
      licensing: {},
    }
    setTracks([...tracks, newTrack])
  }

  return (
    <div className="space-x-2">
      <Button
        type="button"
        variant="outline"
        onClick={duplicateTrack}
        className="text-sm"
      >
        <Repeat className="w-4 h-4 mr-2" />
        Duplicate Track
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={copyFromPrevious}
        className="text-sm"
        disabled={currentTrackIndex === 0}
      >
        <Copy className="w-4 h-4 mr-2" />
        Copy from Previous
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={addNewTrack}
        className="text-sm"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add New Track
      </Button>
    </div>
  )
}

