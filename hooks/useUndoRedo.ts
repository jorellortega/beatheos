import { useState, useCallback, useRef } from 'react'

export interface BeatMakerState {
  sequencerData: { [trackId: number]: boolean[] }
  pianoRollData: { [trackId: number]: any[] }
  tracks: any[]
  bpm: number
  steps: number
  gridDivision: number
  transportKey: string
  mixerSettings: { [trackId: number]: any }
  masterVolume: number
  currentSequencerPatterns: any[]
  layoutMode: 'default' | 'vertical' | 'horizontal'
  timeStretchMode: 'resampling' | 'flex-time'
  isAutoMode: boolean
  isLatidoMode: boolean
  isHeliosMode: boolean
  isBpmToleranceEnabled: boolean
  midiSoundType: 'piano' | 'synth' | 'bass'
  midiVolume: number
  audioLevels: { [trackId: number]: number }
  peakLevels: { [trackId: number]: number }
  masterLevel: number
  masterPeak: number
  savedPatterns: any[]
  activeTab: string
  lastLoadedPattern: string | null
  showPatternDetails: boolean

  editingBpm: boolean
  editingPosition: boolean
  editingTransportKey: boolean
  bpmInputValue: string
  positionInputValue: string
  transportKeyInputValue: string
  showSampleLibrary: boolean
  selectedTrack: number | null
  showPianoRoll: boolean
  pianoRollTrack: number | null
  showAudioPianoRoll: boolean
  audioPianoRollNotes: any[]
  showTrackPianoRoll: boolean
  trackPianoRollTrack: any
  trackPianoRollNotes: any[]
  showEditTrackModal: boolean
  editingTrack: any
  editTrackForm: any
  savingTrack: boolean
  trackEditError: string | null
  bpmRange: [number, number]
  showBpmRangeControls: boolean
  aiPrompt: string
  isAiPromptVisible: boolean
}

export interface VersionHistoryEntry {
  id: string
  timestamp: number
  name: string
  description?: string
  state: BeatMakerState
  isAutoSave: boolean
}

export function useUndoRedo(maxHistorySize: number = 50) {
  const [history, setHistory] = useState<VersionHistoryEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false)
  const lastActionRef = useRef<string>('')
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Create a deep copy of the state to avoid reference issues
  const deepCopyState = useCallback((state: BeatMakerState): BeatMakerState => {
    return JSON.parse(JSON.stringify(state))
  }, [])

  // Add a new state to history
  const addToHistory = useCallback((
    state: BeatMakerState, 
    action: string, 
    name?: string, 
    description?: string,
    isAutoSave: boolean = false
  ) => {
    // Don't add to history if this is an undo/redo action
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false)
      return
    }

    // Debounce rapid actions (like sequencer changes)
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current)
    }

    actionTimeoutRef.current = setTimeout(() => {
      const newEntry: VersionHistoryEntry = {
        id: `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        name: name || `${action} at ${new Date().toLocaleTimeString()}`,
        description,
        state: deepCopyState(state),
        isAutoSave
      }

      setHistory(prev => {
        // Remove any entries after current index (if we're not at the end)
        const newHistory = prev.slice(0, currentIndex + 1)
        
        // Add the new entry
        newHistory.push(newEntry)
        
        // Limit history size
        if (newHistory.length > maxHistorySize) {
          newHistory.shift()
        }
        
        return newHistory
      })

      setCurrentIndex(prev => Math.min(prev + 1, maxHistorySize - 1))
      lastActionRef.current = action
    }, 300) // 300ms debounce
  }, [currentIndex, maxHistorySize, deepCopyState, isUndoRedoAction])

  // Undo function
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setIsUndoRedoAction(true)
      setCurrentIndex(prev => prev - 1)
      return history[currentIndex - 1]?.state
    }
    return null
  }, [currentIndex, history])

  // Redo function
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setIsUndoRedoAction(true)
      setCurrentIndex(prev => prev + 1)
      return history[currentIndex + 1]?.state
    }
    return null
  }, [currentIndex, history])

  // Check if undo is available
  const canUndo = currentIndex > 0

  // Check if redo is available
  const canRedo = currentIndex < history.length - 1

  // Get current state
  const getCurrentState = useCallback(() => {
    return history[currentIndex]?.state || null
  }, [history, currentIndex])

  // Get current version info
  const getCurrentVersion = useCallback(() => {
    return history[currentIndex] || null
  }, [history, currentIndex])

  // Save a named version
  const saveVersion = useCallback((
    state: BeatMakerState,
    name: string,
    description?: string
  ) => {
    addToHistory(state, 'manual-save', name, description, false)
  }, [addToHistory])

  // Auto-save version
  const autoSave = useCallback((state: BeatMakerState) => {
    addToHistory(state, 'auto-save', 'Auto-save', 'Automatically saved version', true)
  }, [addToHistory])

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  // Get history summary
  const getHistorySummary = useCallback(() => {
    return history.map((entry, index) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      timestamp: entry.timestamp,
      isCurrent: index === currentIndex,
      isAutoSave: entry.isAutoSave
    }))
  }, [history, currentIndex])

  // Jump to specific version
  const jumpToVersion = useCallback((versionId: string) => {
    const versionIndex = history.findIndex(entry => entry.id === versionId)
    if (versionIndex !== -1) {
      setIsUndoRedoAction(true)
      setCurrentIndex(versionIndex)
      return history[versionIndex]?.state
    }
    return null
  }, [history])

  // Get undo/redo stack info
  const getStackInfo = useCallback(() => {
    return {
      totalVersions: history.length,
      currentIndex,
      canUndo,
      canRedo,
      undoCount: currentIndex,
      redoCount: history.length - currentIndex - 1
    }
  }, [history.length, currentIndex, canUndo, canRedo])

  return {
    // Core functions
    addToHistory,
    undo,
    redo,
    saveVersion,
    autoSave,
    clearHistory,
    jumpToVersion,
    
    // State queries
    canUndo,
    canRedo,
    getCurrentState,
    getCurrentVersion,
    getHistorySummary,
    getStackInfo,
    
    // History data
    history,
    currentIndex
  }
} 