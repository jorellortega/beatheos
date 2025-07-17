import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, Download, Plus, FolderOpen, Music, Piano } from 'lucide-react'
import { Track, SequencerData } from '@/hooks/useBeatMaker'
import { useState } from 'react'

interface SequencerGridProps {
  tracks: Track[]
  steps: number
  sequencerData: SequencerData
  onToggleStep: (trackId: number, stepIndex: number) => void
  currentStep: number
  bpm: number
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[]) => void
  onSaveTrackPattern?: (trackId: number, name: string, description?: string, category?: string, tags?: string[]) => void
  onSaveAllPatterns?: () => void
  onLoadPattern?: (patternId: string) => void
}

export function SequencerGrid({
  tracks,
  steps,
  sequencerData,
  onToggleStep,
  currentStep,
  bpm,
  onSavePattern,
  onSaveTrackPattern,
  onSaveAllPatterns,
  onLoadPattern
}: SequencerGridProps) {
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')
  const [patternCategory, setPatternCategory] = useState('')
  const [patternTags, setPatternTags] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [savingTrackId, setSavingTrackId] = useState<number | null>(null)

  const handleSavePattern = () => {
    if (!patternName.trim()) {
      alert('Please enter a pattern name')
      return
    }
    
    const tags = patternTags.split(',').map(tag => tag.trim()).filter(Boolean)
    onSavePattern?.(patternName, patternDescription, patternCategory, tags)
    
    // Reset form
    setPatternName('')
    setPatternDescription('')
    setPatternCategory('')
    setPatternTags('')
    setShowSaveForm(false)
  }

  const handleSaveTrackPattern = (trackId: number) => {
    const track = tracks.find(t => t.id === trackId)
    if (!track) return

    const trackName = track.name
    const defaultName = `${trackName} Pattern`
    const tags = [trackName.toLowerCase()]
    
    onSaveTrackPattern?.(trackId, defaultName, `Saved ${trackName} pattern`, 'Individual Track', tags)
  }

  const handleSaveAllPatterns = () => {
    onSaveAllPatterns?.()
  }

  return (
    <Card className="!bg-[#141414] border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Sequencer Grid</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {bpm} BPM
            </Badge>
            <Badge variant="outline" className="text-xs">
              {steps} Steps
            </Badge>
            <Badge variant="outline" className="text-xs">
              {tracks.length} Tracks
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveForm(!showSaveForm)}
              className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Pattern
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAllPatterns}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
            >
              <Download className="w-4 h-4 mr-1" />
              Save All
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/editpatterns', '_blank')}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Library
            </Button>
          </div>
        </div>

        {/* Save Pattern Form */}
        {showSaveForm && (
          <div className="mt-4 bg-[#1a1a1a] border border-gray-600 rounded-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-300 mb-1 block">Pattern Name *</label>
                <Input
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="My Awesome Beat"
                  className="bg-[#0a0a0a] border-gray-600"
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-300 mb-1 block">Category</label>
                <Input
                  value={patternCategory}
                  onChange={(e) => setPatternCategory(e.target.value)}
                  placeholder="Hip Hop, Trap, etc."
                  className="bg-[#0a0a0a] border-gray-600"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="text-xs text-gray-300 mb-1 block">Description</label>
                <Input
                  value={patternDescription}
                  onChange={(e) => setPatternDescription(e.target.value)}
                  placeholder="Describe your pattern..."
                  className="bg-[#0a0a0a] border-gray-600"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="text-xs text-gray-300 mb-1 block">Tags (comma separated)</label>
                <Input
                  value={patternTags}
                  onChange={(e) => setPatternTags(e.target.value)}
                  placeholder="drums, bass, melody, etc."
                  className="bg-[#0a0a0a] border-gray-600"
                />
              </div>
              
              <div className="md:col-span-2 flex gap-2">
                <Button
                  onClick={handleSavePattern}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save Pattern
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSaveForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row with step numbers */}
            <div className="flex mb-2">
              <div className="w-24 flex-shrink-0"></div> {/* Track name column */}
              {Array.from({ length: steps }, (_, i) => {
                const stepNumber = i + 1
                const isDownbeat = stepNumber % 4 === 1 // Steps 1, 5, 9, 13, etc.
                const isCurrentStep = i === currentStep
                
                return (
                  <div
                    key={i}
                    className={`w-12 h-8 flex items-center justify-center text-xs font-mono border-r ${
                      isDownbeat ? 'border-yellow-500 border-r-2' : 'border-gray-600'
                    } ${
                      isCurrentStep 
                        ? 'bg-[#2a2a2a] text-white border-2 border-white' 
                        : isDownbeat 
                          ? 'bg-yellow-900/30 text-yellow-300 font-bold' 
                          : 'bg-[#1f1f1f] text-gray-300'
                    } ${
                      stepNumber % 4 === 1 && stepNumber !== 1 ? 'ml-1' : ''
                    }`}
                  >
                    {stepNumber}
                  </div>
                )
              })}
            </div>

            {/* Track rows */}
            {tracks.map((track) => (
              <div key={track.id} className="flex mb-3">
                {/* Track name and save button */}
                <div className="w-32 flex-shrink-0 flex items-center px-2 h-8 gap-2">
                  <div className={`w-3 h-3 rounded-full ${track.color} mr-2`}></div>
                  {track.name === 'MIDI' ? (
                    <Piano className="w-3 h-3 text-gray-300 mr-1" />
                  ) : (
                    <Music className="w-3 h-3 text-gray-300 mr-1" />
                  )}
                  <span className="text-white text-sm truncate flex-1">{track.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSaveTrackPattern(track.id)}
                    className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                    title={`Save ${track.name} Pattern`}
                  >
                    <Save className="w-3 h-3" />
                  </Button>
                </div>

                {/* Step buttons */}
                {Array.from({ length: steps }, (_, stepIndex) => {
                  const isActive = sequencerData[track.id]?.[stepIndex] || false
                  const isCurrentStep = stepIndex === currentStep
                  
                  return (
                    <Button
                      key={stepIndex}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`w-12 h-8 rounded-none border-r border-gray-600 ${
                        isActive ? track.color : 'bg-[#1f1f1f] hover:bg-[#2a2a2a]'
                      } ${
                        isCurrentStep ? 'ring-2 ring-white' : ''
                      }`}
                      onClick={() => onToggleStep(track.id, stepIndex)}
                    >
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

