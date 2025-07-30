// Types for Track Arrangement System

export interface PatternBlock {
  id: string
  name: string
  tracks: Track[]
  sequencerData: { [trackId: number]: boolean[] }
  bpm: number
  steps: number
  duration: number // in bars
  startBar: number
  endBar: number
  color: string
  trackId: number
}

export interface Track {
  id: number
  name: string
  color: string
  audioUrl?: string
  type?: string
  pitchShift?: number
  playbackRate?: number
}

export interface TrackArrangement {
  id: string
  userId: string
  sessionId?: string
  trackId: number
  trackName: string
  
  // Arrangement metadata
  name: string
  description?: string
  version: string
  
  // Pattern arrangement data
  patternBlocks: PatternBlock[]
  totalBars: number
  zoomLevel: number
  
  // Arrangement settings
  bpm: number
  steps: number
  
  // Tags and categorization
  tags?: string[]
  category?: string // 'intro', 'verse', 'chorus', 'bridge', 'drop', 'breakdown'
  genre?: string // 'Hip Hop', 'Trap', 'R&B'
  subgenre?: string // 'Boom Bap', 'Drill', 'Neo Soul'
  audioType?: string // 'Melody Loop', 'Drum Loop', 'Kick', 'Snare'
  isFavorite: boolean
  isTemplate: boolean
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  lastUsedAt?: Date
}

export interface ArrangementVersion {
  id: string
  arrangementId: string
  versionNumber: number
  name?: string
  description?: string
  patternBlocks: PatternBlock[]
  totalBars: number
  createdAt: Date
}

export interface ArrangementTag {
  id: string
  arrangementId: string
  tagName: string
  createdAt: Date
}

export interface ArrangementSearchFilters {
  searchTerm?: string
  category?: string
  hasDrops?: boolean
  hasCuts?: boolean
  minBars?: number
  maxBars?: number
  isFavorite?: boolean
  isTemplate?: boolean
}

export interface ArrangementSearchResult {
  arrangementId: string
  trackName: string
  arrangementName: string
  category?: string
  totalBars: number
  patternCount: number
  createdAt: Date
}

// API Response types
export interface SaveArrangementRequest {
  trackId: number
  trackName: string
  name: string
  description?: string
  patternBlocks: PatternBlock[]
  totalBars: number
  zoomLevel: number
  bpm: number
  steps: number
  tags?: string[]
  category?: string
  genre?: string
  subgenre?: string
  audioType?: string
  isFavorite?: boolean
  isTemplate?: boolean
  sessionId?: string
}

export interface LoadArrangementRequest {
  arrangementId: string
  versionNumber?: number // If not provided, loads latest version
}

export interface UpdateArrangementRequest {
  arrangementId: string
  name?: string
  description?: string
  patternBlocks?: PatternBlock[]
  totalBars?: number
  zoomLevel?: number
  tags?: string[]
  category?: string
  genre?: string
  subgenre?: string
  audioType?: string
  isFavorite?: boolean
  isTemplate?: boolean
}

export interface DeleteArrangementRequest {
  arrangementId: string
}

export interface SearchArrangementsRequest {
  filters: ArrangementSearchFilters
  limit?: number
  offset?: number
}

// Utility types for arrangement operations
export interface ArrangementStats {
  totalArrangements: number
  totalPatterns: number
  averagePatternsPerArrangement: number
  mostUsedCategories: { category: string; count: number }[]
  recentArrangements: TrackArrangement[]
}

export interface ArrangementTemplate {
  id: string
  name: string
  description?: string
  category: string
  patternBlocks: PatternBlock[]
  totalBars: number
  bpm: number
  steps: number
  usageCount: number
  createdAt: Date
} 