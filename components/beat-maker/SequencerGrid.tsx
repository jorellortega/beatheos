import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Save, Download, Plus, FolderOpen, Music, Piano, Brain, MoreHorizontal, List } from 'lucide-react'
import { Track, SequencerData } from '@/hooks/useBeatMaker'
import { useState, useEffect, useMemo } from 'react'
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
  gridDivision?: number // New prop for grid quantization
  onGridDivisionChange?: (division: number) => void // New prop for grid division change
  onQuantizeSequencerData?: (trackId: number, quantizedData: boolean[]) => void // New prop for quantizing sequencer data
  onNavigateToSongArrangement?: () => void // New prop for navigating to song arrangement
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
  onToggleTrackWaveform,
  gridDivision = 4, // Default to quarter notes (1/4)
  onGridDivisionChange,
  onQuantizeSequencerData,
  onNavigateToSongArrangement
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
  const [stepWidth, setStepWidth] = useState(32)
  const [showFullLoopWaveforms, setShowFullLoopWaveforms] = useState(true)

  // Calculate effective steps based on grid division (like loop editor)
  const secondsPerBeat = 60 / bpm
  const stepDuration = secondsPerBeat / (gridDivision / 4)
  const effectiveSteps = Math.ceil((steps * stepDuration) / stepDuration)

  // Memoize current step to prevent unnecessary re-renders
  const memoizedCurrentStep = useMemo(() => currentStep, [currentStep])

  // Calculate loop lengths for each track
  const getTrackLoopLength = (track: any) => {
    if (!track.audioUrl || !track.loopStartTime || !track.loopEndTime) {
      return null // No loop
    }
    
    const loopDuration = track.loopEndTime - track.loopStartTime
    const sequencerDuration = steps * stepDuration
    
    // For display purposes, show the actual loop length, not the extended length
    const displayLoopDuration = loopDuration
    const loopRatio = displayLoopDuration / sequencerDuration
    
    return {
      loopDuration,
      displayLoopDuration,
      sequencerDuration,
      loopRatio,
      isLonger: loopRatio > 1.1, // 10% tolerance
      isShorter: loopRatio < 0.9, // 10% tolerance
      repeatCount: Math.ceil(sequencerDuration / loopDuration),
      loopBars: Math.round((displayLoopDuration / stepDuration) / 4) // Convert to bars
    }
  }

  // Get the longest loop length for comparison
  const getLongestLoopLength = () => {
    let maxLoopDuration = 0
    tracks.forEach(track => {
      const loopInfo = getTrackLoopLength(track)
      if (loopInfo && loopInfo.displayLoopDuration > maxLoopDuration) {
        maxLoopDuration = loopInfo.displayLoopDuration
      }
    })
    return maxLoopDuration
  }

  // Function to calculate time position for a step
  const getStepTime = (stepIndex: number) => {
    const stepNumber = stepIndex + 1
    const stepTime = (stepNumber - 1) * stepDuration
    return stepTime
  }

  // Function to convert step to bar (like loop editor: ALWAYS 4 steps per bar)
  const stepToBar = (stepIndex: number) => {
    return Math.floor(stepIndex / 4) + 1
  }

  // Function to check if step is start of a bar
  const isBarStart = (stepIndex: number) => {
    return stepIndex % 4 === 0
  }

  // Function to convert step index to grid-aware step number
  const getGridStepNumber = (stepIndex: number) => {
    const stepNumber = stepIndex + 1
    
    // For now, just show step numbers (like loop editor)
    // The grid division affects timing, not the visual step numbers
    return stepNumber.toString()
  }

  // Function to handle grid-aware step toggling
  const handleGridStepToggle = (trackId: number, stepIndex: number) => {
    // For now, we'll use the original step index
    // In the future, this could be enhanced to handle grid quantization properly
    onToggleStep(trackId, stepIndex)
  }

  // Function to quantize sequencer data to current grid division
  const quantizeSequencerData = (data: boolean[], fromGridDivision: number, toGridDivision: number) => {
    if (fromGridDivision === toGridDivision) return data
    
    const newData = new Array(steps).fill(false)
    const fromStepsPerBeat = fromGridDivision / 4
    const toStepsPerBeat = toGridDivision / 4
    
    // Map old grid positions to new grid positions
    for (let i = 0; i < data.length; i++) {
      if (data[i]) {
        const oldBeat = Math.floor(i / fromStepsPerBeat)
        const oldStepInBeat = i % fromStepsPerBeat
        const oldTime = oldBeat + (oldStepInBeat / fromStepsPerBeat)
        
        // Find the closest new grid position
        const newStep = Math.round(oldTime * toStepsPerBeat)
        if (newStep >= 0 && newStep < steps) {
          newData[newStep] = true
        }
      }
    }
    
    return newData
  }

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

  // Handle grid division change with quantization
  const handleGridDivisionChange = (newGridDivision: number) => {
    if (onGridDivisionChange) {
      onGridDivisionChange(newGridDivision)
      
      // Quantize sequencer data for all tracks
      if (onQuantizeSequencerData) {
        tracks.forEach(track => {
          const currentData = sequencerData[track.id] || new Array(steps).fill(false)
          const quantizedData = quantizeSequencerData(currentData, gridDivision, newGridDivision)
          onQuantizeSequencerData(track.id, quantizedData)
        })
      }
    }
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
                {steps} Steps ({gridDivision === 4 ? '1/4' : gridDivision === 8 ? '1/8' : gridDivision === 16 ? '1/16' : '1/32'})
              </Badge>
              <Badge variant="outline" className="text-xs">
                {tracks.length} Tracks
              </Badge>
              
                      {/* Progress indicator */}
        <div className="flex items-center gap-2 ml-4">
          <div className="text-xs text-gray-400">
            Step {memoizedCurrentStep + 1}/{steps}
          </div>
          <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-100"
              style={{ width: `${((memoizedCurrentStep + 1) / steps) * 100}%` }}
            />
          </div>
          <div className="text-xs text-gray-400">
            {((memoizedCurrentStep + 1) / steps * 100).toFixed(0)}%
          </div>
        </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white text-sm">Zoom:</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="20"
                max="64"
                value={stepWidth}
                onChange={(e) => setStepWidth(parseInt(e.target.value))}
                className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${((stepWidth - 20) / (64 - 20)) * 100}%, #374151 ${((stepWidth - 20) / (64 - 20)) * 100}%, #374151 100%)`
                }}
              />
              <span className="text-white text-xs min-w-[2rem]">{stepWidth}px</span>
            </div>
            
            {/* Grid Quantization Dropdown */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-white text-sm">Grid:</span>
              <select
                value={gridDivision}
                onChange={(e) => handleGridDivisionChange(parseInt(e.target.value))}
                className="w-20 h-8 text-sm bg-[#1a1a1a] border border-gray-600 rounded text-white font-mono text-center"
              >
                <option value={4}>1/4</option>
                <option value={8}>1/8</option>
                <option value={16}>1/16</option>
                <option value={32}>1/32</option>
              </select>
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
            >
              <List className="w-4 h-4 mr-1" />
              Edit Patterns
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToSongArrangement}
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
            >
              <Music className="w-4 h-4 mr-1" />
              Song Arrangement
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('/editpatterns', '_blank')}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
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
            
            {showWaveforms && (
              <Button
                variant={showFullLoopWaveforms ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFullLoopWaveforms(!showFullLoopWaveforms)}
                className={`${
                  showFullLoopWaveforms 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 border-purple-500' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-500'
                }`}
                title={showFullLoopWaveforms ? "Full loop waveforms ON - shows complete loop length" : "8-bar only - shows only sequencer area"}
              >
                <div className="w-4 h-4 mr-1 flex items-center justify-center">
                  <div className="w-2 h-2 bg-current rounded-sm"></div>
                </div>
                {showFullLoopWaveforms ? 'Full Loop' : '8-Bar Only'}
              </Button>
            )}
            
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
          <div className="min-w-max overflow-x-auto">
            {/* Step Numbers Row */}
            <div className="flex h-8">
              <div className="w-56 flex-shrink-0"></div>
              {Array.from({ length: steps }, (_, i) => {
                const stepLabel = getGridStepNumber(i)
                const isDownbeat = isBarStart(i)
                const isCurrentStep = i === memoizedCurrentStep
                
                return (
                  <div
                    key={`step-${i}`}
                    style={{ 
                      width: `${stepWidth}px`, 
                      minWidth: gridDivision > 16 ? '40px' : `${stepWidth}px`,
                      fontSize: gridDivision > 8 ? '10px' : '12px'
                    }}
                    className={`flex items-center justify-center text-xs font-mono border-r relative ${
                      isDownbeat ? 'border-yellow-500 border-r-2' : 'border-gray-600'
                    } ${
                      isCurrentStep 
                        ? 'bg-[#2a2a2a] text-white border-2 border-white' 
                        : isDownbeat 
                          ? 'bg-black text-gray-300 font-bold' 
                          : 'bg-[#1f1f1f] text-gray-300'
                    }`}
                  >
                    {stepLabel}
                    {/* Playhead indicator */}
                    {isCurrentStep && (
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white animate-pulse"></div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Bar Numbers Row */}
            <div className="flex h-6">
              <div className="w-56 flex-shrink-0"></div>
              {Array.from({ length: steps }, (_, i) => {
                const barNumber = stepToBar(i)
                const isBarStartStep = isBarStart(i)
                
                return (
                  <div
                    key={`bar-${i}`}
                    style={{ 
                      width: `${stepWidth}px`, 
                      minWidth: gridDivision > 16 ? '40px' : `${stepWidth}px`,
                      fontSize: '10px'
                    }}
                    className={`flex items-center justify-center text-xs font-mono border-r border-gray-600 ${
                      isBarStartStep 
                        ? 'bg-green-900/30 text-green-400 font-bold' 
                        : 'bg-[#1a1a1a] text-gray-500'
                    }`}
                  >
                    {isBarStartStep ? `Bar ${barNumber}` : ''}
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
                          currentStep={memoizedCurrentStep}
                          activeSteps={sequencerData[track.id] || []}
                          isVisible={true}
                          loopStartTime={track.loopStartTime}
                          loopEndTime={track.loopEndTime}
                          showFullLoop={showFullLoopWaveforms}
                          playbackRate={track.playbackRate || 1.0}
                        />
                        {/* Loop length indicator */}
                        {track.loopStartTime !== undefined && track.loopEndTime !== undefined && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className="text-xs text-gray-400">
                              Loop: {Math.round(((track.loopEndTime - track.loopStartTime) / stepDuration) / 4)} bars
                            </div>
                          </div>
                        )}
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
                      
                      {/* Loop length indicator */}
                      {(() => {
                        const loopInfo = getTrackLoopLength(track)
                        if (!loopInfo) return null
                        
                        const maxLoopDuration = getLongestLoopLength()
                        const isLongest = loopInfo.loopDuration === maxLoopDuration
                        
                        return (
                          <div className="flex items-center gap-1">
                            {loopInfo.isLonger && (
                              <div 
                                className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"
                                title={`Longer loop: ${loopInfo.displayLoopDuration.toFixed(2)}s (${loopInfo.loopBars} bars, ${(loopInfo.loopRatio * 100).toFixed(0)}% of sequencer)`}
                              />
                            )}
                            {loopInfo.isShorter && (
                              <div 
                                className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"
                                title={`Shorter loop: ${loopInfo.displayLoopDuration.toFixed(2)}s (${loopInfo.loopBars} bars, ${(loopInfo.loopRatio * 100).toFixed(0)}% of sequencer) - will repeat ${loopInfo.repeatCount}x`}
                              />
                            )}
                            {!loopInfo.isLonger && !loopInfo.isShorter && (
                              <div 
                                className="w-2 h-2 bg-green-500 rounded-full"
                                title={`Matched loop: ${loopInfo.displayLoopDuration.toFixed(2)}s (${loopInfo.loopBars} bars, ${(loopInfo.loopRatio * 100).toFixed(0)}% of sequencer)`}
                              />
                            )}
                          </div>
                        )
                      })()}
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
                    const isCurrentStep = stepIndex === memoizedCurrentStep
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
                          onClick={() => handleGridStepToggle(track.id, stepIndex)}
                          title={`Step ${getGridStepNumber(stepIndex)}`}
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
                            <span className="text-xs text-cyan-300 ml-1" title={`${getGridStepNumber(stepIndex)} - ${pianoRollData[track.id]?.filter(note => {
                              const sequencerStep1Based = stepIndex + 1
                              return note.startStep === sequencerStep1Based
                            }).length || 0} notes`}>
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

            {/* Time Labels Row */}
            <div className="flex h-6">
              <div className="w-56 flex-shrink-0"></div>
              {Array.from({ length: steps }, (_, i) => {
                const stepTime = getStepTime(i)
                const isBarStartStep = isBarStart(i)
                
                return (
                  <div
                    key={`time-${i}`}
                    style={{ 
                      width: `${stepWidth}px`, 
                      minWidth: gridDivision > 16 ? '40px' : `${stepWidth}px`,
                      fontSize: '9px'
                    }}
                    className={`flex items-center justify-center text-xs font-mono border-r border-gray-600 ${
                      isBarStartStep 
                        ? 'bg-green-900/20 text-green-500' 
                        : 'bg-[#1a1a1a] text-gray-600'
                    }`}
                  >
                    {stepTime.toFixed(1)}s
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

