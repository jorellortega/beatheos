'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Play, Square, RotateCcw, Settings, Save, Upload } from 'lucide-react'
import { SequencerGrid } from '@/components/beat-maker/SequencerGrid'
import { TrackList } from '@/components/beat-maker/TrackList'
import { SampleLibrary } from '@/components/beat-maker/SampleLibrary'
import { useBeatMaker, Track } from '@/hooks/useBeatMaker'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { supabase } from '@/lib/supabaseClient'

export default function BeatMakerPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(120)
  const [currentStep, setCurrentStep] = useState(0)
  const [tracks, setTracks] = useState<Track[]>([
    { id: 1, name: 'Kick', audioUrl: null, color: 'bg-red-500' },
    { id: 2, name: 'Snare', audioUrl: null, color: 'bg-blue-500' },
    { id: 3, name: 'Hi-Hat', audioUrl: null, color: 'bg-green-500' },
    { id: 4, name: 'Sample', audioUrl: null, color: 'bg-purple-500' },
  ])
  const [steps, setSteps] = useState(16)
  const [showSampleLibrary, setShowSampleLibrary] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null)

  // Helper to check if any track has a valid audio file
  const hasLoadedAudio = tracks.some(track => track.audioUrl && track.audioUrl !== 'undefined')

  // Helper to ensure we always use a public URL
  const getPublicAudioUrl = (audioUrlOrPath: string) => {
    if (!audioUrlOrPath) return ''
    // If it's already a public URL, return as is
    if (audioUrlOrPath.startsWith('http')) return audioUrlOrPath
    // Otherwise, treat as file path and get public URL
    const { data } = supabase.storage.from('beats').getPublicUrl(audioUrlOrPath)
    return data.publicUrl || ''
  }

  const {
    sequencerData,
    toggleStep,
    playSequence,
    stopSequence,
    isSequencePlaying,
    currentStep: sequencerCurrentStep
  } = useBeatMaker(tracks, steps, bpm)

  // Sync state with the hook
  useEffect(() => {
    setIsPlaying(isSequencePlaying)
    setCurrentStep(sequencerCurrentStep)
  }, [isSequencePlaying, sequencerCurrentStep])

  const handlePlayPause = () => {
    if (isPlaying) {
      stopSequence()
    } else {
      playSequence()
    }
  }

  const handleReset = () => {
    stopSequence()
    setCurrentStep(0)
  }

  const handleTrackAudioSelect = (trackId: number, audioUrlOrPath: string) => {
    const publicUrl = getPublicAudioUrl(audioUrlOrPath)
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, audioUrl: publicUrl } : track
    ))
    setShowSampleLibrary(false)
    setSelectedTrack(null)
  }

  const handleOpenSampleLibrary = (trackId: number) => {
    setSelectedTrack(trackId)
    setShowSampleLibrary(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Beat Maker</h1>
          <p className="text-gray-400">Create beats with your audio library</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Pattern
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Load Pattern
          </Button>
        </div>
      </div>

      {/* Transport Controls */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Transport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={handlePlayPause}
                        variant={isPlaying ? "destructive" : "default"}
                        size="lg"
                        className="w-16 h-16 rounded-full"
                        disabled={!hasLoadedAudio}
                      >
                        {isPlaying ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasLoadedAudio && (
                    <TooltipContent>
                      <span>Assign audio to at least one track to enable playback.</span>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">BPM:</span>
                <Badge variant="secondary" className="min-w-[60px] text-center">
                  {bpm}
                </Badge>
              </div>
              <div className="w-32">
                <Slider
                  value={[bpm]}
                  onValueChange={(value) => setBpm(value[0])}
                  min={60}
                  max={200}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Steps:</span>
              <div className="flex gap-1">
                {[8, 16, 32].map((stepCount) => (
                  <Button
                    key={stepCount}
                    variant={steps === stepCount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSteps(stepCount)}
                    className="w-8 h-8 p-0"
                  >
                    {stepCount}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Position:</span>
              <Badge variant="outline" className="min-w-[60px] text-center">
                {currentStep + 1}/{steps}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Track List */}
        <div className="lg:col-span-1">
          <TrackList
            tracks={tracks}
            onTrackAudioSelect={handleOpenSampleLibrary}
            currentStep={currentStep}
            sequencerData={sequencerData}
          />
        </div>

        {/* Sequencer Grid */}
        <div className="lg:col-span-3">
          <SequencerGrid
            tracks={tracks}
            steps={steps}
            sequencerData={sequencerData}
            onToggleStep={toggleStep}
            currentStep={currentStep}
          />
        </div>
      </div>

      {/* Sample Library Modal */}
      {showSampleLibrary && selectedTrack && (
        <SampleLibrary
          isOpen={showSampleLibrary}
          onClose={() => setShowSampleLibrary(false)}
          onSelectAudio={(audioUrl) => handleTrackAudioSelect(selectedTrack, audioUrl)}
        />
      )}
    </div>
  )
}

