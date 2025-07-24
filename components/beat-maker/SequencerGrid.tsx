import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Save, Download, Plus, FolderOpen, Music, Piano, Brain, MoreHorizontal } from 'lucide-react'
import { Track, SequencerData } from '@/hooks/useBeatMaker'
import { useState, useEffect } from 'react'
import { TrackWaveform } from './TrackWaveform'

interface SequencerGridProps {
  tracks: Track[]
  steps: number
  sequencerData: SequencerData
  pianoRollData?: {[trackId: number]: any[]}
  onToggleStep: (trackId: number, stepIndex: number) => void
  currentStep: number
  bpm: number
  onSavePattern?: (name: string, description?: string, category?: string, tags?: string[], genreId?: string, subgenre?: string) => void
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
  genres?: any[]
  subgenres?: string[]
  onGenreChange?: (genreId: string) => void
  showWaveforms?: boolean // New prop for waveform visibility
  onToggleWaveforms?: () => void // New prop for waveform toggle function
  trackWaveformStates?: {[trackId: number]: boolean} // Individual track waveform visibility
  onToggleTrackWaveform?: (trackId: number) => void // Toggle individual track waveform
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
  onShuffleAllPatterns,
  genres = [],
  subgenres = [],
  onGenreChange,
  showWaveforms = false, // Default to false for better performance
  onToggleWaveforms,
  trackWaveformStates = {},
  onToggleTrackWaveform
}: SequencerGridProps) {
  
  const [patternName, setPatternName] = useState('')
  const [patternDescription, setPatternDescription] = useState('')
  const [patternCategory, setPatternCategory] = useState('')
  const [patternTags, setPatternTags] = useState('')
  const [selectedGenreId, setSelectedGenreId] = useState('none')
  const [selectedSubgenre, setSelectedSubgenre] = useState('none')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [savingTrackId, setSavingTrackId] = useState<number | null>(null)
  const [expandedNames, setExpandedNames] = useState<{[trackId: number]: boolean}>({})
  const [stepWidth, setStepWidth] = useState(48)

  // Function to get track display name with icons
  const getTrackDisplayName = (trackName: string) => {
    if (trackName.includes(' Loop')) {
      const baseName = trackName.replace(' Loop', '')
      const loopIcon = '🔄'
      
      // Add specific icons for different loop types
      if (baseName === 'Melody') return `${loopIcon} Melody`
      if (baseName === 'Drum') return `${loopIcon} Drum`
      if (baseName === 'Hihat') return `${loopIcon} Hihat`
      if (baseName === 'Percussion') return `${loopIcon} Perc`
      if (baseName === '808') return `${loopIcon} 808`
      if (baseName === 'Bass') return `${loopIcon} Bass`
      if (baseName === 'Piano') return `${loopIcon} Piano`
      if (baseName === 'Guitar') return `${loopIcon} Guitar`
      if (baseName === 'Synth') return `${loopIcon} Synth`
      if (baseName === 'Vocal') return `${loopIcon} Vocal`
      
      // Default for other loop types
      return `${loopIcon} ${baseName}`
    }
    
    // For non-loop tracks, return the original name
    return trackName
  }

  const handleSavePattern = () => {
    if (!patternName.trim()) {
      alert('Please enter a pattern name')
      return
    }
    
    const tags = patternTags.split(',').map(tag => tag.trim()).filter(Boolean)
    onSavePattern?.(patternName, patternDescription, patternCategory, tags, selectedGenreId === 'none' ? '' : selectedGenreId, selectedSubgenre === 'none' ? '' : selectedSubgenre)
    
    setPatternName('')
    setPatternDescription('')
    setPatternCategory('')
    setPatternTags('')
    setSelectedGenreId('none')
    setSelectedSubgenre('none')
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
              variant={showWaveforms ? "default" : "outline"}
              size="sm"
              onClick={onToggleWaveforms}
              className={`${
                showWaveforms 
                  ? 'bg-green-600 text-white hover:bg-green-700 border-green-500' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
              }`}
              title={showWaveforms ? "Waveforms are ON - shows audio visualizations (slower)" : "Waveforms are OFF - faster performance (no visualizations)"}
            >
              <div className="w-4 h-4 mr-1 flex items-center justify-center">
                <div className="w-3 h-2 bg-current rounded-sm"></div>
              </div>
              {showWaveforms ? 'Waveforms ON' : 'Waveforms OFF'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAllPatterns}
              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
            >
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-2 h-2 border border-current rounded-sm"></div>
              </div>
            </Button>
          </div>

          {showSaveForm && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-4">Save Pattern</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Name *</label>
                  <Input
                    value={patternName}
                    onChange={(e) => setPatternName(e.target.value)}
                    placeholder="Pattern name"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Category</label>
                  <Input
                    value={patternCategory}
                    onChange={(e) => setPatternCategory(e.target.value)}
                    placeholder="Pattern category"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Description</label>
                  <Input
                    value={patternDescription}
                    onChange={(e) => setPatternDescription(e.target.value)}
                    placeholder="Pattern description"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Tags (comma-separated)</label>
                  <Input
                    value={patternTags}
                    onChange={(e) => setPatternTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Genre</label>
                  <Select value={selectedGenreId} onValueChange={setSelectedGenreId}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="none">No Genre</SelectItem>
                      {genres.map((genre) => (
                        <SelectItem key={genre.id} value={genre.id}>
                          {genre.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm mb-1 block">Subgenre</label>
                  <Select value={selectedSubgenre} onValueChange={setSelectedSubgenre}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select subgenre" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="none">No Subgenre</SelectItem>
                      {subgenres.map((subgenre) => (
                        <SelectItem key={subgenre} value={subgenre}>
                          {subgenre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSavePattern} className="bg-green-600 hover:bg-green-700">
                  Save Pattern
                </Button>
                <Button variant="outline" onClick={() => setShowSaveForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="flex h-8">
              <div className="w-56 flex-shrink-0"></div>
              {Array.from({ length: steps }, (_, i) => {
                const stepNumber = i + 1
                const isDownbeat = stepNumber % 4 === 1
                const isCurrentStep = i === currentStep
                
                return (
                  <div
                    key={`step-${i}`}
                    style={{ width: `${stepWidth}px`, minWidth: `${stepWidth}px` }}
                    className={`flex items-center justify-center text-xs font-mono border-r ${
                      isDownbeat ? 'border-yellow-500 border-r-2' : 'border-gray-600'
                    } ${
                      isCurrentStep 
                        ? 'bg-[#2a2a2a] text-white border-2 border-white' 
                        : isDownbeat 
                          ? 'bg-black text-gray-300 font-bold' 
                          : 'bg-[#1f1f1f] text-gray-300'
                    }`}
                  >
                    {stepNumber}
                  </div>
                )
              })}
            </div>

            {tracks.map((track) => (
              <div key={track.id}>
                {/* Waveform for tracks with custom samples - moved above sequencer pattern */}
                {track.audioUrl && track.audioUrl !== 'undefined' && (
                  (trackWaveformStates[track.id] !== undefined ? trackWaveformStates[track.id] : showWaveforms) && (
                    <div className="flex mb-2">
                      <div className="w-56 flex-shrink-0"></div>
                      <div className="flex-1">
                        <TrackWaveform 
                          audioUrl={track.audioUrl}
                          trackColor={track.color}
                          height={60}
                          width={steps * stepWidth}
                          bpm={bpm}
                          steps={steps}
                          currentStep={currentStep}
                          activeSteps={sequencerData[track.id] || []}
                          isVisible={true}
                        />
                      </div>
                    </div>
                  )
                )}
                
                <div className={`flex ${track.id === tracks[0].id ? 'mt-4' : ''}`}>
                  <div className="w-56 flex-shrink-0 flex flex-col px-2 py-0">
                    <div className="flex items-center gap-2 h-6">
                      <div 
                        className={`w-3 h-3 rounded-full ${track.color} mr-2 cursor-pointer transition-all duration-200 hover:scale-110 ${
                          trackMuteStates?.[track.id] ? 'opacity-50 ring-2 ring-gray-400' : ''
                        }`}
                        onClick={() => onToggleTrackMute?.(track.id)}
                        title={
                          trackMuteStates?.[track.id] ? 'Click to unmute' : 'Click to mute'
                        }
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
                        {getTrackDisplayName(track.name)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-0.5 mt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onShuffleTrackPattern?.(track.id)}
                        className="bg-black text-yellow-400 hover:text-yellow-300 hover:bg-gray-900 border-gray-600"
                        title={`AI ${getTrackDisplayName(track.name)} Pattern`}
                      >
                        <Brain className="w-3 h-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClearTrackPattern?.(track.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title={`Reset ${getTrackDisplayName(track.name)} Pattern`}
                      >
                        <div className="w-3 h-3 flex items-center justify-center">
                          <div className="w-2 h-2 border border-current rounded-sm"></div>
                        </div>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-gray-300 hover:bg-gray-900/20"
                            title="More options"
                          >
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-800 border-gray-600">
                          <DropdownMenuItem
                            onClick={() => handleSaveTrackPattern(track.id)}
                            className="text-green-400 hover:text-green-300 hover:bg-green-900/20 cursor-pointer"
                          >
                            <Save className="w-3 h-3 mr-2" />
                            Save Pattern
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onLoadTrackPattern?.(track.id)}
                            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 cursor-pointer"
                          >
                            <FolderOpen className="w-3 h-3 mr-2" />
                            Load Pattern
                          </DropdownMenuItem>
                          {track.audioUrl && (
                            <DropdownMenuItem
                              onClick={() => onOpenTrackPianoRoll?.(track.id)}
                              className={`cursor-pointer ${
                                pianoRollData[track.id]?.length > 0 
                                  ? 'text-cyan-300 bg-cyan-900/30' 
                                  : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20'
                              }`}
                            >
                              <Piano className="w-3 h-3 mr-2" />
                              Piano Roll {pianoRollData[track.id]?.length > 0 ? `(${pianoRollData[track.id].length} notes)` : ''}
                            </DropdownMenuItem>
                          )}
                          
                          {track.audioUrl && (
                            <DropdownMenuItem
                              onClick={() => onToggleTrackWaveform?.(track.id)}
                              className={`cursor-pointer ${
                                trackWaveformStates[track.id] 
                                  ? 'text-green-300 bg-green-900/30' 
                                  : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                              }`}
                            >
                              <div className="w-3 h-3 mr-2 flex items-center justify-center">
                                <div className="w-2 h-1 bg-current rounded-sm"></div>
                              </div>
                              Waveform {trackWaveformStates[track.id] ? 'ON' : 'OFF'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {Array.from({ length: steps }, (_, stepIndex) => {
                    const isActive = sequencerData[track.id]?.[stepIndex] || false
                    const isCurrentStep = stepIndex === currentStep
                    const sequencerStep1Based = stepIndex + 1
                    const hasPianoRollNotes = pianoRollData[track.id]?.some(note => {
                      const sequencerStep1Based = stepIndex + 1
                      const shouldPlay = note.startStep === sequencerStep1Based
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
                        {hasPianoRollNotes && (
                          <div 
                            style={{ width: `${stepWidth}px`, minWidth: `${stepWidth}px` }}
                            className="h-2 bg-cyan-500/60 border-r border-gray-600 flex items-center justify-center"
                          >
                            <div className="w-1 h-1 bg-cyan-300 rounded-full"></div>
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
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

