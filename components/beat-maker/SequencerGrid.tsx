import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, Download, Plus, FolderOpen, Music, Piano, Brain } from 'lucide-react'
import { Track, SequencerData } from '@/hooks/useBeatMaker'
import { useState, useEffect } from 'react'

interface SequencerGridProps {
  tracks: Track[]
  steps: number
  sequencerData: SequencerData
  pianoRollData?: {[trackId: number]: any[]}
  onToggleStep: (trackId: number, stepIndex: number) => void
  currentStep: number
  bpm: number
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[]) => void
  onSaveTrackPattern?: (track: Track) => void
  onSaveAllPatterns?: () => void
  onLoadPattern?: (patternId: string) => void
  onLoadTrackPattern?: (trackId: number) => void
  onClearAllPatterns?: () => void
  onClearTrackPattern?: (trackId: number) => void
  onToggleTrackMute?: (trackId: number) => void
  trackMuteStates?: {[trackId: number]: boolean}
  onOpenTrackPianoRoll?: (trackId: number) => void
  onShuffleTrack?: (trackId: number) => void
  onShuffleTrackPattern?: (trackId: number) => void
  onShuffleAllPatterns?: () => void
}

export function SequencerGrid({
  tracks,
  steps,
  sequencerData,
  pianoRollData = {},
  onToggleStep,
  currentStep,
  bpm,
  onSavePattern,
  onSaveTrackPattern,
  onSaveAllPatterns,
  onLoadPattern,
  onLoadTrackPattern,
  onClearAllPatterns,
  onClearTrackPattern,
  onToggleTrackMute,
  trackMuteStates,
  onOpenTrackPianoRoll,
  onShuffleTrack,
  onShuffleTrackPattern,
  onShuffleAllPatterns
}: SequencerGridProps) {
  
  // Debug log to see piano roll data
  useEffect(() => {
    console.log(`[SEQUENCER GRID] Piano roll data:`, pianoRollData)
  }, [pianoRollData])
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')
  const [patternCategory, setPatternCategory] = useState('')
  const [patternTags, setPatternTags] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [savingTrackId, setSavingTrackId] = useState<number | null>(null)
  const [expandedNames, setExpandedNames] = useState<{[trackId: number]: boolean}>({})
  const [stepWidth, setStepWidth] = useState(48) // Default step width in pixels

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
    
    onSaveTrackPattern?.(track)
  }

  const handleSaveAllPatterns = () => {
    onSaveAllPatterns?.()
  }

  const toggleNameExpansion = (trackId: number) => {
    setExpandedNames(prev => ({
      ...prev,
      [trackId]: !prev[trackId]
    }))
  }

  return (
    <Card className="!bg-[#141414] border-gray-700">
      <CardHeader>
        <div className="flex flex-col gap-4">
          {/* Title and Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-white">Sequencer Grid</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={onShuffleAllPatterns}
                className="text-xs bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                title="Shuffle all sequencer patterns"
              >
                <Brain className="w-4 h-4" />
              </Button>
            </div>
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
            </div>
          </div>

          {/* Zoom Control Row */}
          <div className="flex items-center gap-3">
            <span className="text-white text-sm">Zoom:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="24"
                max="96"
                value={stepWidth}
                onChange={(e) => setStepWidth(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((stepWidth - 24) / (96 - 24)) * 100}%, #374151 ${((stepWidth - 24) / (96 - 24)) * 100}%, #374151 100%)`
                }}
              />
              <span className="text-white text-xs min-w-[2rem]">{stepWidth}px</span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={() => onLoadPattern?.('database')}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Load Pattern
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
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/editpatterns', '_blank')}
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
            >
              <Piano className="w-4 h-4 mr-1" />
              Patterns
            </Button>
            

            
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllPatterns}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <div className="w-4 h-4 mr-1 flex items-center justify-center">
                <div className="w-3 h-3 border border-current rounded-sm"></div>
              </div>
              Clear All
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
              <div className="w-56 flex-shrink-0"></div> {/* Track name column - match track row width */}
              {Array.from({ length: steps }, (_, i) => {
                const stepNumber = i + 1
                const isDownbeat = stepNumber % 4 === 1 // Steps 1, 5, 9, 13, etc.
                const isCurrentStep = i === currentStep
                
                return (
                  <div
                    key={i}
                    style={{ width: `${stepWidth}px`, minWidth: `${stepWidth}px` }}
                    className={`h-8 flex items-center justify-center text-xs font-mono border-r ${
                      isDownbeat ? 'border-yellow-500 border-r-2' : 'border-gray-600'
                    } ${
                      isCurrentStep 
                        ? 'bg-[#2a2a2a] text-white border-2 border-white' 
                        : isDownbeat 
                          ? 'bg-yellow-900/30 text-yellow-300 font-bold' 
                          : 'bg-[#1f1f1f] text-gray-300'
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
                <div className="w-56 flex-shrink-0 flex items-center px-2 h-8 gap-2">
                  <div 
                    className={`w-3 h-3 rounded-full ${track.color} mr-2 cursor-pointer transition-all duration-200 hover:scale-110 ${
                      trackMuteStates?.[track.id] ? 'opacity-50 ring-2 ring-gray-400' : ''
                    }`}
                    onClick={() => onToggleTrackMute?.(track.id)}
                    title={trackMuteStates?.[track.id] ? 'Click to unmute' : 'Click to mute'}
                  ></div>
                  {track.name === 'MIDI' ? (
                    <Piano className="w-3 h-3 text-gray-300 mr-1" />
                  ) : (
                    <Music className="w-3 h-3 text-gray-300 mr-1" />
                  )}
                  <span 
                    className={`text-white text-sm flex-1 cursor-pointer hover:text-gray-300 transition-colors ${
                      expandedNames[track.id] ? 'whitespace-normal break-words' : 'truncate'
                    }`}
                    onClick={() => toggleNameExpansion(track.id)}
                    title={expandedNames[track.id] ? 'Click to collapse' : 'Click to see full name'}
                  >
                    {track.name}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSaveTrackPattern(track.id)}
                      className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                      title={`Save ${track.name} Pattern`}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onLoadTrackPattern?.(track.id)}
                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
                      title={`Load ${track.name} Pattern`}
                    >
                      <FolderOpen className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onShuffleTrackPattern?.(track.id)}
                      className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                      title={`AI ${track.name} Pattern`}
                    >
                      <Brain className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onClearTrackPattern?.(track.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      title={`Reset ${track.name} Pattern`}
                    >
                      <div className="w-3 h-3 flex items-center justify-center">
                        <div className="w-2 h-2 border border-current rounded-sm"></div>
                      </div>
                    </Button>
                    {track.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenTrackPianoRoll?.(track.id)}
                        className={`hover:bg-cyan-900/20 ${
                          pianoRollData[track.id]?.length > 0 
                            ? 'text-cyan-300 bg-cyan-900/30' 
                            : 'text-cyan-400 hover:text-cyan-300'
                        }`}
                        title={`Open ${track.name} Piano Roll ${pianoRollData[track.id]?.length > 0 ? `(${pianoRollData[track.id].length} notes)` : ''}`}
                      >
                        <Piano className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Step buttons */}
                {Array.from({ length: steps }, (_, stepIndex) => {
                  const isActive = sequencerData[track.id]?.[stepIndex] || false
                  const isCurrentStep = stepIndex === currentStep
                  // Piano roll uses 1-based indexing, sequencer uses 0-based
                  // Convert sequencer step to 1-based for comparison with piano roll notes
                  const sequencerStep1Based = stepIndex + 1
                  const hasPianoRollNotes = pianoRollData[track.id]?.some(note => {
                    // SIMPLE MAPPING: Just check if the piano roll step matches the sequencer step directly
                    const sequencerStep1Based = stepIndex + 1 // Convert to 1-based for comparison
                    const shouldPlay = note.startStep === sequencerStep1Based
                    
                    // Debug logging for the first few steps
                    if (stepIndex < 5) {
                      console.log(`[SEQUENCER GRID] Step ${stepIndex}: Note at ${note.startStep} vs sequencer step ${sequencerStep1Based}, shouldPlay: ${shouldPlay}`)
                    }
                    
                    return shouldPlay
                  }) || false
                  
                  return (
                    <div key={stepIndex} className="flex flex-col">
                      <Button
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        style={{ width: `${stepWidth}px`, minWidth: `${stepWidth}px` }}
                        className={`h-8 rounded-none border-r border-gray-600 ${
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
                      {/* Piano roll notes indicator */}
                      {hasPianoRollNotes && (
                        <div 
                          style={{ width: `${stepWidth}px`, minWidth: `${stepWidth}px` }}
                          className="h-2 bg-cyan-500/60 border-r border-gray-600 flex items-center justify-center"
                        >
                          <div className="w-1 h-1 bg-cyan-300 rounded-full"></div>
                          {/* Show count of piano roll notes */}
                          <span className="text-xs text-cyan-300 ml-1">
                            {pianoRollData[track.id]?.filter(note => {
                              const sequencerStep1Based = stepIndex + 1
                              return note.startStep === sequencerStep1Based
                            }).length || 0}
                          </span>
                        </div>
                      )}
                    </div>
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

// Add custom slider styles
const sliderStyles = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #000000;
    border: 2px solid #fbbf24;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #000000;
    border: 2px solid #fbbf24;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  .slider::-webkit-slider-track {
    height: 8px;
    border-radius: 4px;
    background: transparent;
  }
  
  .slider::-moz-range-track {
    height: 8px;
    border-radius: 4px;
    background: transparent;
  }
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = sliderStyles
  document.head.appendChild(styleElement)
}

