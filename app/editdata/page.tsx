"use client"

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { 
  Search, 
  Filter, 
  Edit, 
  Save, 
  X, 
  Plus, 
  Music, 
  FileAudio, 
  Package,
  Grid,
  List,
  Download,
  Trash2,
  CheckCircle,
  Clock,
  Star,
  Tag,
  Settings,
  Play,
  Square,
  RefreshCw
} from 'lucide-react'
import AudioWaveformEditor from '@/components/AudioWaveformEditor'

interface AudioLibraryItem {
  id: string
  name: string
  type: string
  description?: string
  file_url?: string
  file_size?: number
  pack_id?: string
  subfolder?: string
  pack?: AudioPack
  bpm?: number
  key?: string
  audio_type?: string
  genre?: string
  subgenre?: string
  additional_subgenres?: string[]
  tags?: string[]
  is_ready?: boolean
  instrument_type?: string
  mood?: string
  energy_level?: number
  complexity?: number
  tempo_category?: string
  key_signature?: string
  time_signature?: string
  duration?: number
  sample_rate?: number
  bit_depth?: number
  license_type?: string
  is_new?: boolean
  distribution_type?: string
}

interface AudioPack {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  color: string
  created_at: string
  updated_at: string
  item_count?: number
  subfolders?: AudioSubfolder[]
}

interface AudioSubfolder {
  id: string
  pack_id: string
  name: string
  description?: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export default function EditData() {
  const { user } = useAuth()
  const [audioItems, setAudioItems] = useState<AudioLibraryItem[]>([])
  const [audioPacks, setAudioPacks] = useState<AudioPack[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPack, setSelectedPack] = useState<string>('all')
  const [selectedGenre, setSelectedGenre] = useState<string>('all')
  const [selectedAudioType, setSelectedAudioType] = useState<string>('all')
  const [selectedDistributionType, setSelectedDistributionType] = useState<string>('all')
  const [showNewOnly, setShowNewOnly] = useState(false)
  const [showReadyOnly, setShowReadyOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  // Edit modal state
  const [editingItem, setEditingItem] = useState<AudioLibraryItem | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [currentEditIndex, setCurrentEditIndex] = useState<number>(0)
  const [editMode, setEditMode] = useState<'sequential' | 'shuffle'>('sequential')
  const [shuffleFilter, setShuffleFilter] = useState<'all' | 'missing_bpm' | 'missing_key' | 'missing_both' | 'missing_genre' | 'missing_subgenre' | 'missing_audio_type' | 'missing_instrument_type' | 'missing_mood' | 'missing_energy' | 'missing_complexity' | 'missing_description' | 'missing_tags' | 'missing_multiple'>('missing_both')
  const [isPlayingPreview, setIsPlayingPreview] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  // Pagination state
  const [hasMoreData, setHasMoreData] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  
  // Navigation history for Previous button
  const [navigationHistory, setNavigationHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Default tab state
  const [defaultTab, setDefaultTab] = useState<string>('basic')

  // Bulk edit state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showBulkEditModal, setShowBulkEditModal] = useState(false)
  const [bulkEditField, setBulkEditField] = useState<string>('')
  const [bulkEditValue, setBulkEditValue] = useState<string>('')
  const [bulkEditing, setBulkEditing] = useState(false)

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadAudioData()
      loadAudioPacks()
    }
  }, [user])

  useEffect(() => {
    // Stop audio when modal closes or file changes
    if (!showEditModal || !editingItem?.file_url) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setIsPlayingPreview(false)
      }
    }
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        setIsPlayingPreview(false)
      }
    }
  }, [showEditModal, editingItem?.file_url])

  const loadAudioData = async (loadMore: boolean = false) => {
    if (!user) return
    
    if (loadMore) {
      setIsLoadingMore(true)
    } else {
      setLoading(true)
    }
    
    try {
      console.log('🔄 Loading audio data for user:', user.id)
      
      // First, get total count
      const { count, error: countError } = await supabase
        .from('audio_library_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      
      if (countError) throw countError
      setTotalCount(count || 0)
      
      // Then load data with pagination
      const { data, error } = await supabase
        .from('audio_library_items')
        .select(`
          *,
          pack:audio_packs(name, color)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        // .range(0, 4999) // Load first 5000 items - REMOVED to load all

      if (error) throw error
      
      if (loadMore) {
        setAudioItems(prev => [...prev, ...(data || [])])
      } else {
        setAudioItems(data || [])
      }
      
      // Check if there's more data (since we're loading all, this will be false)
      setHasMoreData(false)
      
      console.log(`✅ Loaded ${data?.length || 0} audio items (Total: ${count})`)
    } catch (error) {
      console.error('❌ Error loading audio data:', error)
    } finally {
      if (loadMore) {
        setIsLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }

  const loadAudioPacks = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('audio_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setAudioPacks(data || [])
    } catch (error) {
      console.error('Error loading audio packs:', error)
    }
  }

  // Refresh function to reload all data
  const refreshData = async () => {
    console.log('🔄 Refreshing all data...')
    await Promise.all([loadAudioData(), loadAudioPacks()])
    console.log('✅ Data refresh complete')
  }

  // Filter and sort audio items
  const getFilteredAndSortedItems = () => {
    let filtered = audioItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.subgenre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPack = selectedPack === 'all' || item.pack_id === selectedPack
      const matchesGenre = selectedGenre === 'all' || item.genre === selectedGenre
      const matchesAudioType = selectedAudioType === 'all' || item.audio_type === selectedAudioType
      const matchesDistribution = selectedDistributionType === 'all' || item.distribution_type === selectedDistributionType
      const matchesNew = !showNewOnly || item.is_new
      const matchesReady = !showReadyOnly || item.is_ready

      // Apply shuffle filter for missing data
      let matchesShuffleFilter = true
      if (editMode === 'shuffle' && shuffleFilter !== 'all') {
        const hasBpm = item.bpm !== null && item.bpm !== undefined
        const hasKey = item.key !== null && item.key !== undefined && item.key !== ''
        const hasGenre = item.genre !== null && item.genre !== undefined && item.genre !== ''
        const hasSubgenre = item.subgenre !== null && item.subgenre !== undefined && item.subgenre !== ''
        const hasAudioType = item.audio_type !== null && item.audio_type !== undefined && item.audio_type !== ''
        const hasInstrumentType = item.instrument_type !== null && item.instrument_type !== undefined && item.instrument_type !== ''
        const hasMood = item.mood !== null && item.mood !== undefined && item.mood !== ''
        const hasEnergy = item.energy_level !== null && item.energy_level !== undefined
        const hasComplexity = item.complexity !== null && item.complexity !== undefined
        const hasDescription = item.description !== null && item.description !== undefined && item.description !== ''
        const hasTags = item.tags !== null && item.tags !== undefined && item.tags.length > 0
        
        switch (shuffleFilter) {
          case 'missing_bpm':
            matchesShuffleFilter = !hasBpm
            break
          case 'missing_key':
            matchesShuffleFilter = !hasKey
            break
          case 'missing_both':
            matchesShuffleFilter = !hasBpm || !hasKey
            break
          case 'missing_genre':
            matchesShuffleFilter = !hasGenre
            break
          case 'missing_subgenre':
            matchesShuffleFilter = !hasSubgenre
            break
          case 'missing_audio_type':
            matchesShuffleFilter = !hasAudioType
            break
          case 'missing_instrument_type':
            matchesShuffleFilter = !hasInstrumentType
            break
          case 'missing_mood':
            matchesShuffleFilter = !hasMood
            break
          case 'missing_energy':
            matchesShuffleFilter = !hasEnergy
            break
          case 'missing_complexity':
            matchesShuffleFilter = !hasComplexity
            break
          case 'missing_description':
            matchesShuffleFilter = !hasDescription
            break
          case 'missing_tags':
            matchesShuffleFilter = !hasTags
            break
          case 'missing_multiple':
            // Items missing 3 or more important fields
            const missingCount = [
              !hasBpm, !hasKey, !hasGenre, !hasSubgenre, 
              !hasAudioType, !hasDescription, !hasTags
            ].filter(Boolean).length
            matchesShuffleFilter = missingCount >= 3
            break
        }
      }

      return matchesSearch && matchesPack && matchesGenre && matchesAudioType && matchesDistribution && matchesNew && matchesReady && matchesShuffleFilter
    })

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof AudioLibraryItem]
      let bValue: any = b[sortBy as keyof AudioLibraryItem]
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase()
      if (typeof bValue === 'string') bValue = bValue.toLowerCase()
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }

  const handleEditItem = async (e: React.FormEvent, shouldNavigate: boolean = false) => {
    e.preventDefault()
    console.log('🔍 handleEditItem called with shouldNavigate:', shouldNavigate)
    if (!editingItem || !user) return

    setSaving(true)
    setEditError(null)

    try {
      const updateData = {
        name: editingItem.name,
        type: editingItem.type,
        description: editingItem.description || null,
        bpm: editingItem.bpm || null,
        key: editingItem.key || null,
        audio_type: editingItem.audio_type || null,
        genre: editingItem.genre || null,
        subgenre: editingItem.subgenre || null,
        additional_subgenres: editingItem.additional_subgenres?.length ? editingItem.additional_subgenres : null,
        tags: editingItem.tags?.length ? editingItem.tags : null,
        is_ready: editingItem.is_ready || false,
        instrument_type: editingItem.instrument_type || null,
        mood: editingItem.mood || null,
        energy_level: editingItem.energy_level || null,
        complexity: editingItem.complexity || null,
        tempo_category: editingItem.tempo_category || null,
        key_signature: editingItem.key_signature || null,
        time_signature: editingItem.time_signature || null,
        duration: editingItem.duration || null,
        sample_rate: editingItem.sample_rate || null,
        bit_depth: editingItem.bit_depth || null,
        license_type: editingItem.license_type || null,
        is_new: editingItem.is_new || false,
        distribution_type: editingItem.distribution_type || 'private'
      }
      
      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .eq('id', editingItem.id)

      if (error) throw error

      // Update local state
      setAudioItems(prev => prev.map(item => 
        item.id === editingItem.id ? { ...item, ...updateData } : item
      ))

      // Only navigate if explicitly requested
      if (shouldNavigate) {
        navigateToNextItem()
      }
    } catch (error) {
      console.error('Error updating item:', error)
      setEditError('Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const navigateToNextItem = () => {
    console.log('🔍 navigateToNextItem called - this should not happen automatically!')
    console.trace('Navigation stack trace:')
    
    const filteredItems = getFilteredAndSortedItems()
    if (filteredItems.length === 0) {
      setShowEditModal(false)
      setEditingItem(null)
      return
    }

    // Add current item to history before navigating
    if (editingItem) {
      const newHistory = [...navigationHistory.slice(0, historyIndex + 1), editingItem.id]
      setNavigationHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
    }

    let nextIndex: number
    if (editMode === 'shuffle') {
      // Get random index different from current
      const availableIndices = filteredItems
        .map((_, index) => index)
        .filter(index => index !== currentEditIndex)
      
      if (availableIndices.length === 0) {
        // If only one item, close modal
        setShowEditModal(false)
        setEditingItem(null)
        return
      }
      
      nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      // Sequential navigation
      nextIndex = (currentEditIndex + 1) % filteredItems.length
    }

    setCurrentEditIndex(nextIndex)
    setEditingItem(filteredItems[nextIndex])
  }

  const navigateToPreviousItem = () => {
    const filteredItems = getFilteredAndSortedItems()
    
    // Check if we have history to go back to
    if (historyIndex > 0) {
      const previousItemId = navigationHistory[historyIndex - 1]
      const previousItem = filteredItems.find(item => item.id === previousItemId)
      
      if (previousItem) {
        const previousIndex = filteredItems.findIndex(item => item.id === previousItemId)
        setCurrentEditIndex(previousIndex)
        setEditingItem(previousItem)
        setHistoryIndex(historyIndex - 1)
        return
      }
    }
    
    // Fallback to sequential navigation if no history
    if (filteredItems.length === 0) {
      setShowEditModal(false)
      setEditingItem(null)
      return
    }

    let prevIndex: number
    if (editMode === 'shuffle') {
      // Get random index different from current
      const availableIndices = filteredItems
        .map((_, index) => index)
        .filter(index => index !== currentEditIndex)
      
      if (availableIndices.length === 0) {
        // If only one item, close modal
        setShowEditModal(false)
        setEditingItem(null)
        return
      }
      
      prevIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
    } else {
      // Sequential navigation
      prevIndex = currentEditIndex === 0 ? filteredItems.length - 1 : currentEditIndex - 1
    }

    setCurrentEditIndex(prevIndex)
    setEditingItem(filteredItems[prevIndex])
  }

  const openEditModal = (item: AudioLibraryItem) => {
    const filteredItems = getFilteredAndSortedItems()
    const itemIndex = filteredItems.findIndex(filteredItem => filteredItem.id === item.id)
    
    setCurrentEditIndex(itemIndex >= 0 ? itemIndex : 0)
    setEditingItem(item)
    setShowEditModal(true)
    
    // Initialize navigation history with the first item
    setNavigationHistory([item.id])
    setHistoryIndex(0)
  }

  const handleBulkEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedItems.size === 0 || !bulkEditField || !user) return

    setBulkEditing(true)
    try {
      const updateData: any = {}
      
      // Handle different field types
      if (bulkEditField === 'is_ready' || bulkEditField === 'is_new') {
        updateData[bulkEditField] = bulkEditValue === 'true'
      } else if (bulkEditField === 'energy_level' || bulkEditField === 'complexity' || bulkEditField === 'bpm' || bulkEditField === 'sample_rate' || bulkEditField === 'bit_depth') {
        updateData[bulkEditField] = parseInt(bulkEditValue) || null
      } else if (bulkEditField === 'duration') {
        updateData[bulkEditField] = parseFloat(bulkEditValue) || null
      } else if (bulkEditField === 'tags') {
        updateData[bulkEditField] = bulkEditValue.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0)
      } else if (bulkEditField === 'additional_subgenres') {
        updateData[bulkEditField] = bulkEditValue.split(',').map((subgenre: string) => subgenre.trim()).filter((subgenre: string) => subgenre.length > 0)
      } else {
        updateData[bulkEditField] = bulkEditValue || null
      }
      
      const { error } = await supabase
        .from('audio_library_items')
        .update(updateData)
        .in('id', Array.from(selectedItems))

      if (error) throw error

      // Update local state
      setAudioItems(prev => prev.map(item => 
        selectedItems.has(item.id) ? { ...item, ...updateData } : item
      ))

      setShowBulkEditModal(false)
      setSelectedItems(new Set())
      setBulkEditField('')
      setBulkEditValue('')
    } catch (error) {
      console.error('Error bulk updating items:', error)
    } finally {
      setBulkEditing(false)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
  }

  const selectAll = () => {
    const filteredItems = getFilteredAndSortedItems()
    setSelectedItems(new Set(filteredItems.map(item => item.id)))
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const getUniqueValues = (field: keyof AudioLibraryItem) => {
    const values = new Set(audioItems.map(item => item[field]).filter(Boolean))
    return Array.from(values).sort()
  }

  const filteredItems = getFilteredAndSortedItems()

  const handlePlayPreview = () => {
    if (!editingItem?.file_url) return
    if (!audioRef.current) {
      audioRef.current = new window.Audio(editingItem.file_url)
      audioRef.current.onended = () => setIsPlayingPreview(false)
    } else {
      audioRef.current.src = editingItem.file_url
    }
    audioRef.current.currentTime = 0
    audioRef.current.play()
    setIsPlayingPreview(true)
  }

  const handleStopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlayingPreview(false)
    }
  }

  const handleTogglePreview = () => {
    if (isPlayingPreview) {
      handleStopPreview()
    } else {
      handlePlayPreview()
    }
  }

  // Helper to highlight BPM and Key in file name
  function highlightMusicInfoInFileName(name: string, onBpmClick?: (bpm: number) => void, onKeyClick?: (key: string) => void) {
    const highlights: Array<{text: string, type: 'bpm' | 'bpm-fallback' | 'key', value: string | number, start: number, end: number}> = []
    
    // Find all BPM patterns first - prioritize explicit BPM indicators
    const bpmPatterns = [
      /(\d{2,4}\s*bpm)/i,  // 130bpm, 130 bpm, 130BPM, etc.
      /(bpm\s*\d{2,4})/i,  // bpm130, bpm 130, BPM 130, etc.
    ]
    
    for (const pattern of bpmPatterns) {
      const match = name.match(pattern)
      if (match) {
        const [bpmText] = match
        const bpmNumber = parseInt(bpmText.replace(/\D/g, ''))
        const start = name.indexOf(bpmText)
        highlights.push({
          text: bpmText,
          type: 'bpm',
          value: bpmNumber,
          start,
          end: start + bpmText.length
        })
        break
      }
    }
    
    // If no explicit BPM pattern found, try to find potential BPM numbers
    if (highlights.length === 0) {
      // Find all numbers between 60-200 that could be BPM
      const allBpmCandidates = []
      const bpmCandidateRegex = /[_\s]?(6[0-9]|[7-9]\d|1[0-9]\d|200)[_\s]?/g
      let match
      
      while ((match = bpmCandidateRegex.exec(name)) !== null) {
        const [fullMatch] = match
        const bpmNumber = fullMatch.replace(/[_\s]/g, '')
        const number = parseInt(bpmNumber)
        
        // Check if this number is likely to be BPM by looking at surrounding context
        const beforeMatch = name.substring(Math.max(0, match.index - 10), match.index)
        const afterMatch = name.substring(match.index + fullMatch.length, match.index + fullMatch.length + 10)
        
        // Prioritize numbers that are:
        // 1. Standalone (surrounded by spaces/underscores)
        // 2. Not part of other identifiers (like "91V")
        // 3. In positions where BPM typically appears
        
        let priority = 0
        if (fullMatch.match(/^[_\s]\d+[_\s]$/)) {
          priority = 3 // Highest priority: _70_ or " 70 "
        } else if (fullMatch.match(/^[_\s]\d+$/) || fullMatch.match(/^\d+[_\s]$/)) {
          priority = 2 // High priority: _70 or 70_
        } else if (!beforeMatch.match(/[A-Za-z]$/) && !afterMatch.match(/^[A-Za-z]/)) {
          priority = 1 // Medium priority: not part of word
        } else {
          priority = 0 // Low priority: part of word like "91V"
        }
        
        allBpmCandidates.push({
          text: fullMatch,
          value: number,
          start: match.index,
          end: match.index + fullMatch.length,
          priority
        })
      }
      
      // Sort by priority and take the highest priority match
      if (allBpmCandidates.length > 0) {
        allBpmCandidates.sort((a, b) => b.priority - a.priority)
        const bestMatch = allBpmCandidates[0]
        
        highlights.push({
          text: bestMatch.text,
          type: 'bpm-fallback',
          value: bestMatch.value,
          start: bestMatch.start,
          end: bestMatch.end
        })
        
        // If there are multiple candidates with the same priority, add them as alternatives
        const samePriorityCandidates = allBpmCandidates.filter(c => c.priority === bestMatch.priority)
        if (samePriorityCandidates.length > 1) {
          console.log(`Multiple BPM candidates found: ${samePriorityCandidates.map(c => c.value).join(', ')}`)
        }
      }
    }
    
    // Find all key patterns
    const keyPatterns = [
      /\b([A-G][#b]?m?)\b/g,  // C, C#, Cb, Am, A#m, etc.
      /\b([A-G][#b]?\s*major)\b/gi,  // C major, F# major, etc.
      /\b([A-G][#b]?\s*minor)\b/gi,  // A minor, D# minor, etc.
      /\b([A-G][#b]?maj)\b/gi,  // Emaj, Cmaj, F#maj, etc.
      /\b([A-G][#b]?min)\b/gi,  // Emin, Amin, D#min, etc.
      /\b([A-G][#b]?m)\b/gi,  // Em, Am, C#m, etc.
      /\b([A-G][#b]?M)\b/g,  // EM, AM, C#M, etc.
      /[_\s]([A-G][#b]?)[_\s]/g,  // _A_, _C#_, _Bb_ etc. (keys surrounded by underscores or spaces)
      /[_\s]([A-G][#b]?min)[_\s]/gi,  // _Fmin_, _Amin_, etc. (minor keys with underscores)
      /[_\s]([A-G][#b]?maj)[_\s]/gi,  // _Fmaj_, _Amaj_, etc. (major keys with underscores)
      /[_\s]([A-G][#b]?min)(?=\.[a-zA-Z0-9]+$)/gi,  // _Fmin.wav, _Amin.mp3, etc. (minor keys before file extension)
      /[_\s]([A-G][#b]?maj)(?=\.[a-zA-Z0-9]+$)/gi,  // _Fmaj.wav, _Amaj.mp3, etc. (major keys before file extension)
      /[_\s]([A-G][#b]?m)[_\s]/gi,  // _Am_, _Em_, _Cm_ etc. (minor keys with m suffix and underscores)
      /[_\s]([A-G][#b]?m)(?=\.[a-zA-Z0-9]+$)/gi,  // _Am.wav, _Em.mp3, etc. (minor keys with m suffix before file extension)
      /([A-G][#b]?)(?=\.[a-zA-Z0-9]+$)/g,  // A#.wav, C.wav, etc. (keys right before file extension)
      /_([A-G][#b]?)(?=\.[a-zA-Z0-9]+$)/g,  // _A#.wav, _C.wav, etc. (keys with underscore before file extension)
    ]
    
    for (const pattern of keyPatterns) {
      let match
      while ((match = pattern.exec(name)) !== null) {
        const keyText = match[0]
        // For patterns with capture groups (like _F#_), use the captured group
        // For patterns without capture groups, use the full match
        const keyValue = match[1] || keyText.replace(/\s*(major|minor)/i, '').replace(/\s+/g, '')
        

        
        highlights.push({
          text: keyText,
          type: 'key',
          value: keyValue,
          start: match.index,
          end: match.index + keyText.length
        })
      }
    }
    
    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start)
    
    // Build the JSX with highlights
    let lastIndex = 0
    const elements: JSX.Element[] = []
    
    highlights.forEach((highlight) => {
      // Add text before highlight
      if (highlight.start > lastIndex) {
        elements.push(<span key={`text-${lastIndex}`}>{name.slice(lastIndex, highlight.start)}</span>)
      }
      
      // Add highlighted element
      const className = highlight.type === 'bpm' 
        ? "bg-yellow-300 text-black font-bold px-1 rounded cursor-pointer hover:bg-yellow-400 transition-colors"
        : highlight.type === 'bpm-fallback'
        ? "bg-orange-300 text-black font-semibold px-1 rounded cursor-pointer hover:bg-orange-400 transition-colors"
        : "bg-blue-300 text-black font-bold px-1 rounded cursor-pointer hover:bg-blue-400 transition-colors"
      
      const title = highlight.type.startsWith('bpm') 
        ? "Click to insert BPM into form"
        : "Click to insert Key into form"
      
      const onClick = highlight.type.startsWith('bpm')
        ? () => onBpmClick?.(highlight.value as number)
        : () => onKeyClick?.(highlight.value as string)
      
      elements.push(
        <span 
          key={`highlight-${highlight.start}`}
          className={className}
          onClick={onClick}
          title={title}
        >
          {highlight.text}
        </span>
      )
      
      lastIndex = highlight.end
    })
    
    // Add remaining text
    if (lastIndex < name.length) {
      elements.push(<span key={`text-${lastIndex}`}>{name.slice(lastIndex)}</span>)
    }
    
    return elements.length > 0 ? <>{elements}</> : name
  }

  const handleBpmFromNameClick = (bpm: number) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, bpm })
    }
  }

  // Helper function to normalize key notation
  const normalizeKey = (key: string): string => {
    if (!key) return key
    
    // Convert to lowercase for easier processing
    const lowerKey = key.toLowerCase().trim()
    
    // Remove common suffixes and normalize
    const normalized = lowerKey
      .replace(/\s*(minor|min)\b/g, 'm')  // minor, min -> m
      .replace(/\s*(major|maj)\b/g, '')   // major, maj -> (remove)
      .replace(/\s+/g, '')                // remove spaces
    
    // Convert back to proper case (first letter uppercase)
    return normalized.charAt(0).toUpperCase() + normalized.slice(1)
  }

  const handleKeyFromNameClick = (key: string) => {
    if (editingItem) {
      const normalizedKey = normalizeKey(key)
      setEditingItem({ ...editingItem, key: normalizedKey })
    }
  }

    return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audio Library Manager</h1>
          <p className="text-gray-600 mt-2">Manage and edit your audio files with advanced metadata</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            onClick={() => {
              if (filteredItems.length > 0) openEditModal(filteredItems[0])
            }}
            disabled={filteredItems.length === 0}
            className="flex items-center gap-2"
            title="Start editing files"
          >
            <Edit className="w-4 h-4" />
            Start Editing
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setEditMode('shuffle')
              setShuffleFilter('missing_both')
              setDefaultTab('musical')
              const missingDataItems = audioItems.filter(item => 
                !item.bpm || !item.key || item.key === ''
              )
              if (missingDataItems.length > 0) {
                openEditModal(missingDataItems[0])
              }
            }}
            disabled={audioItems.filter(item => !item.bpm || !item.key || item.key === '').length === 0}
            className="flex items-center gap-2"
            title="Start editing files missing BPM or Key"
          >
            <Edit className="w-4 h-4" />
            Edit Missing Data
          </Button>
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={loading}
            className="flex items-center gap-2"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedItems.size > 0 && (
            <Button onClick={() => setShowBulkEditModal(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Bulk Edit ({selectedItems.size})
            </Button>
          )}
      </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
          <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
                  placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
          </div>
            </div>
            
            <div>
              <Label>Pack</Label>
              <Select value={selectedPack} onValueChange={setSelectedPack}>
                <SelectTrigger>
                  <SelectValue placeholder="All Packs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Packs</SelectItem>
                  {audioPacks.map(pack => (
                    <SelectItem key={pack.id} value={pack.id}>{pack.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </div>

            <div>
              <Label>Genre</Label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="All Genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {getUniqueValues('genre').map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
      </div>

            <div>
              <Label>Audio Type</Label>
              <Select value={selectedAudioType} onValueChange={setSelectedAudioType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {getUniqueValues('audio_type').map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
        </div>
      </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Distribution Type</Label>
              <Select value={selectedDistributionType} onValueChange={setSelectedDistributionType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Distribution Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Distribution Types</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created_at">Date Added</SelectItem>
                  <SelectItem value="bpm">BPM</SelectItem>
                  <SelectItem value="genre">Genre</SelectItem>
                  <SelectItem value="energy_level">Energy Level</SelectItem>
                  <SelectItem value="complexity">Complexity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Sort Order</Label>
              <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
              </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showNewOnly"
                  checked={showNewOnly}
                  onChange={(e) => setShowNewOnly(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showNewOnly">New Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showReadyOnly"
                  checked={showReadyOnly}
                  onChange={(e) => setShowReadyOnly(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="showReadyOnly">Ready Only</Label>
              </div>
              </div>
          </div>

          {selectedItems.size > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedItems.size} item(s) selected
                    </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
                  </div>
                    </div>
                  )}
        </CardContent>
      </Card>

      {/* Results */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm text-gray-600">
            Showing {filteredItems.length} of {audioItems.length} items
            {totalCount > audioItems.length && (
              <span className="text-gray-500"> (Total: {totalCount})</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs">
            <span className="text-orange-600">
              BPM: {audioItems.filter(item => !item.bpm).length}
            </span>
            <span className="text-blue-600">
              Key: {audioItems.filter(item => !item.key || item.key === '').length}
            </span>
            <span className="text-green-600">
              Genre: {audioItems.filter(item => !item.genre || item.genre === '').length}
            </span>
            <span className="text-purple-600">
              Desc: {audioItems.filter(item => !item.description || item.description === '').length}
            </span>
            <span className="text-red-600">
              Tags: {audioItems.filter(item => !item.tags || item.tags.length === 0).length}
            </span>
          </div>
        </div>
        {hasMoreData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAudioData(true)}
            disabled={isLoadingMore}
            className="text-xs w-full sm:w-auto"
          >
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading audio files...</p>
              </div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No audio files found matching your criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
          {filteredItems.map(item => (
            <Card key={item.id} className={`${viewMode === 'list' ? 'flex' : ''} hover:shadow-md transition-shadow`}>
              <CardContent className={`${viewMode === 'list' ? 'flex-1 flex items-center gap-4' : 'p-4'}`}>
                {viewMode === 'list' && (
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="rounded"
                  />
                )}
                
                <div className={`${viewMode === 'list' ? 'flex-1' : ''} space-y-3`}>
                  <div className="flex items-start justify-between">
                      <div className="flex-1">
                      <h3 className="font-semibold text-lg truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600 truncate">{item.description}</p>
                          </div>
                    {viewMode === 'grid' && (
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleItemSelection(item.id)}
                        className="rounded ml-2"
                      />
                    )}
                  </div>

                            <div className="flex flex-wrap gap-1">
                    {item.genre && (
                                <Badge variant="secondary" className="text-xs">
                        {item.genre}
                                </Badge>
                              )}
                    {item.subgenre && (
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                        {item.subgenre}
                            </Badge>
                          )}
                    {item.is_new && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        <Star className="w-3 h-3 mr-1" />
                        New
                            </Badge>
                          )}
                    {item.is_ready && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                            </Badge>
                          )}
                    {item.distribution_type && (
                      <Badge variant="secondary" className={`text-xs ${
                        item.distribution_type === 'public' ? 'bg-green-100 text-green-800' :
                        item.distribution_type === 'commercial' ? 'bg-purple-100 text-purple-800' :
                        item.distribution_type === 'other' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.distribution_type}
                            </Badge>
                          )}
                        </div>

                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    {item.bpm && <span>BPM: {item.bpm}</span>}
                    {item.key && <span>Key: {item.key}</span>}
                    {item.energy_level && <span>Energy: {item.energy_level}/10</span>}
                    {item.complexity && <span>Complexity: {item.complexity}/10</span>}
                          </div>

                  <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                      onClick={() => openEditModal(item)}
                        >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                        </Button>
                    {item.file_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={item.file_url} download>
                          <Download className="w-4 h-4" />
                        </a>
                        </Button>
                    )}
                      </div>
                </div>
              </CardContent>
                    </Card>
                  ))}
                        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-lg sm:text-xl">
                <span className="text-sm sm:text-base text-gray-500 mb-2 sm:mb-0">
                  {currentEditIndex + 1} of {getFilteredAndSortedItems().length}
                </span>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline">Edit Audio File:</span>
                  <span className="sm:hidden">File:</span>
                  {editingItem?.name ? highlightMusicInfoInFileName(editingItem.name, handleBpmFromNameClick, handleKeyFromNameClick) : ''}
                  {editingItem?.file_url && (
                    <Button 
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleTogglePreview}
                      className="ml-2"
                      title={isPlayingPreview ? 'Stop Preview' : 'Play Preview'}
                    >
                      {isPlayingPreview ? <Square className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </Button>
                  )}
                </div>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Select value={editMode} onValueChange={(value: 'sequential' | 'shuffle') => setEditMode(value)}>
                  <SelectTrigger className="w-28 sm:w-32 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sequential">Sequential</SelectItem>
                    <SelectItem value="shuffle">Shuffle</SelectItem>
                  </SelectContent>
                </Select>
                {editMode === 'shuffle' && (
                  <Select value={shuffleFilter} onValueChange={(value: 'all' | 'missing_bpm' | 'missing_key' | 'missing_both' | 'missing_genre' | 'missing_subgenre' | 'missing_audio_type' | 'missing_instrument_type' | 'missing_mood' | 'missing_energy' | 'missing_complexity' | 'missing_description' | 'missing_tags' | 'missing_multiple') => setShuffleFilter(value)}>
                    <SelectTrigger className="w-40 sm:w-48 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="missing_both">Missing BPM/Key</SelectItem>
                      <SelectItem value="missing_audio_type">Missing Audio Type</SelectItem>
                      <SelectItem value="missing_bpm">Missing BPM</SelectItem>
                      <SelectItem value="missing_key">Missing Key</SelectItem>
                      <SelectItem value="missing_genre">Missing Genre</SelectItem>
                      <SelectItem value="missing_subgenre">Missing Subgenre</SelectItem>
                      <SelectItem value="missing_instrument_type">Missing Instrument Type</SelectItem>
                      <SelectItem value="missing_mood">Missing Mood</SelectItem>
                      <SelectItem value="missing_energy">Missing Energy Level</SelectItem>
                      <SelectItem value="missing_complexity">Missing Complexity</SelectItem>
                      <SelectItem value="missing_description">Missing Description</SelectItem>
                      <SelectItem value="missing_tags">Missing Tags</SelectItem>
                      <SelectItem value="missing_multiple">Missing Multiple (3+)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-6">
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1">
                  <TabsTrigger value="basic" className="text-xs sm:text-sm px-2 sm:px-3">Basic</TabsTrigger>
                  <TabsTrigger value="musical" className="text-xs sm:text-sm px-2 sm:px-3">Musical</TabsTrigger>
                  <TabsTrigger value="metadata" className="text-xs sm:text-sm px-2 sm:px-3">Metadata</TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs sm:text-sm px-2 sm:px-3">Advanced</TabsTrigger>
                  <TabsTrigger value="waveform" className="text-xs sm:text-sm px-2 sm:px-3">Waveform</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                      <Label>Name</Label>
                      <Input
                        value={editingItem.name}
                        onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                        required
                      />
                        </div>
                        <div>
                      <Label>Type</Label>
                                        <Input
                        value={editingItem.type}
                        onChange={(e) => setEditingItem({...editingItem, type: e.target.value})}
                                        />
                                      </div>
                                    </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={editingItem.description || ''}
                      onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                      rows={3}
                    />
                                      </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_ready"
                        checked={editingItem.is_ready || false}
                        onChange={(e) => setEditingItem({...editingItem, is_ready: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_ready">Mark as Ready</Label>
                                           </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_new"
                        checked={editingItem.is_new || false}
                        onChange={(e) => setEditingItem({...editingItem, is_new: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_new">Mark as New</Label>
                                         </div>
                                       </div>
                </TabsContent>

                <TabsContent value="musical" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>BPM</Label>
                      <Input
                        type="number"
                        value={editingItem.bpm || ''}
                        onChange={(e) => setEditingItem({...editingItem, bpm: parseInt(e.target.value) || null})}
                      />
                                     </div>
                    <div>
                      <Label>Key</Label>
                      <Input
                        value={editingItem.key || ''}
                        onChange={(e) => {
                          const normalizedKey = normalizeKey(e.target.value)
                          setEditingItem({...editingItem, key: normalizedKey})
                        }}
                        placeholder="e.g., C, Am, F#m, Bb"
                      />
                                         </div>
                                       </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Key Signature</Label>
                      <Input
                        value={editingItem.key_signature || ''}
                        onChange={(e) => setEditingItem({...editingItem, key_signature: e.target.value})}
                        placeholder="e.g., C major, A minor"
                      />
                             </div>
                    <div>
                      <Label>Time Signature</Label>
                      <Input
                        value={editingItem.time_signature || ''}
                        onChange={(e) => setEditingItem({...editingItem, time_signature: e.target.value})}
                        placeholder="e.g., 4/4, 3/4"
                      />
                             </div>
                           </div>
                           
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Genre</Label>
                                   <Input
                        value={editingItem.genre || ''}
                        onChange={(e) => setEditingItem({...editingItem, genre: e.target.value})}
                                   />
                                 </div>
                    <div>
                      <Label>Subgenre</Label>
                      <Input
                        value={editingItem.subgenre || ''}
                        onChange={(e) => setEditingItem({...editingItem, subgenre: e.target.value})}
                      />
                               </div>
                                 </div>

                  <div>
                    <Label>Additional Subgenres (comma-separated)</Label>
                    <Input
                      value={editingItem.additional_subgenres?.join(', ') || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem, 
                        additional_subgenres: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                      })}
                      placeholder="drill, dark trap, melodic"
                    />
                                 </div>

                  <div>
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={editingItem.tags?.join(', ') || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem, 
                        tags: e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0)
                      })}
                      placeholder="trap, dark, aggressive, 808"
                    />
                                     </div>
        </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Audio Type</Label>
                      <Input
                        value={editingItem.audio_type || ''}
                        onChange={(e) => setEditingItem({...editingItem, audio_type: e.target.value})}
                        placeholder="e.g., kick, snare, melody, loop"
                      />
                    </div>
            <div>
                      <Label>Instrument Type</Label>
                      <Input
                        value={editingItem.instrument_type || ''}
                        onChange={(e) => setEditingItem({...editingItem, instrument_type: e.target.value})}
                        placeholder="e.g., piano, guitar, synthesizer"
                      />
            </div>
          </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                      <Label>Mood</Label>
                      <Input
                        value={editingItem.mood || ''}
                        onChange={(e) => setEditingItem({...editingItem, mood: e.target.value})}
                        placeholder="e.g., dark, uplifting, melancholic"
                      />
                </div>
                <div>
                  <Label>Tempo Category</Label>
                  <Select 
                    value={editingItem?.tempo_category || ''} 
                    onValueChange={(value) => setEditingItem(prev => prev ? { ...prev, tempo_category: value } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tempo category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                      <Label>Energy Level (1-10)</Label>
                    <Input
                      type="number"
                        min="1"
                        max="10"
                        value={editingItem.energy_level || ''}
                        onChange={(e) => setEditingItem({...editingItem, energy_level: parseInt(e.target.value) || null})}
                      />
                    </div>
                    <div>
                      <Label>Complexity (1-10)</Label>
                    <Input
                      type="number"
                        min="1"
                        max="10"
                        value={editingItem.complexity || ''}
                        onChange={(e) => setEditingItem({...editingItem, complexity: parseInt(e.target.value) || null})}
                    />
                  </div>
                </div>

                <div>
                    <Label>Distribution Type</Label>
                  <Select
                      value={editingItem.distribution_type || 'private'} 
                      onValueChange={(value) => setEditingItem({...editingItem, distribution_type: value})}
                  >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
               </div>
            </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Duration (seconds)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editingItem.duration || ''}
                        onChange={(e) => setEditingItem({...editingItem, duration: parseFloat(e.target.value) || null})}
                      />
                </div>
                    <div>
                      <Label>Sample Rate</Label>
                      <Input
                        type="number"
                        value={editingItem.sample_rate || ''}
                        onChange={(e) => setEditingItem({...editingItem, sample_rate: parseInt(e.target.value) || null})}
                        placeholder="e.g., 44100, 48000"
                      />
                </div>
              </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Bit Depth</Label>
                      <Input
                        type="number"
                        value={editingItem.bit_depth || ''}
                        onChange={(e) => setEditingItem({...editingItem, bit_depth: parseInt(e.target.value) || null})}
                        placeholder="e.g., 16, 24"
                              />
                            </div>
                    <div>
                      <Label>License Type</Label>
                      <Input
                        value={editingItem.license_type || ''}
                        onChange={(e) => setEditingItem({...editingItem, license_type: e.target.value})}
                        placeholder="e.g., royalty-free, commercial"
                      />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="waveform" className="space-y-4">
              {editingItem?.file_url ? (
                <div onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}>
                  <AudioWaveformEditor
                    audioUrl={editingItem.file_url}
                    bpm={editingItem.bpm || 120}
                    musicalKey={editingItem.key || 'C'}
                    timeSignature={editingItem.time_signature || '4/4'}
                    onBpmChange={(bpm) => setEditingItem({...editingItem, bpm})}
                    onKeyChange={(key) => setEditingItem({...editingItem, key})}
                    onTimeSignatureChange={(timeSignature) => setEditingItem({...editingItem, time_signature: timeSignature})}
                    onMarkerAdd={(position, label) => {
                      console.log(`Marker added at ${position}s: ${label}`)
                    }}
                    onPatternAdd={(startBar, endBar, label) => {
                      console.log(`Pattern added from bar ${startBar} to ${endBar}: ${label}`)
                    }}
                  />
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileAudio className="w-12 h-12 mx-auto mb-4" />
                  <p>No audio file available for waveform editing</p>
                </div>
              )}
            </TabsContent>
              </Tabs>

              {editError && (
                <div className="text-red-500 text-sm">{editError}</div>
              )}

              <DialogFooter className="flex flex-col gap-6 mt-4">
                {/* Navigation controls */}
                <div className="flex justify-center gap-2 sm:gap-4">
                  <Button
                    variant="outline"
                    onClick={navigateToPreviousItem}
                    disabled={currentEditIndex === 0}
                    className="min-w-[100px] sm:min-w-[120px] text-sm"
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={navigateToNextItem}
                    disabled={currentEditIndex >= filteredItems.length - 1}
                    className="min-w-[100px] sm:min-w-[120px] text-sm"
                  >
                    Next →
                  </Button>
                </div>
                
                {/* Ready status and action controls */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mark-as-ready"
                      checked={editingItem?.is_ready || false}
                      onChange={(e) => setEditingItem(prev => prev ? { ...prev, is_ready: e.target.checked } : null)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="mark-as-ready" className="text-sm text-gray-300">
                      Mark as Ready
                    </label>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowEditModal(false)} className="text-sm">
                      Close
                    </Button>
                    <Button 
                      type="button" 
                      onClick={(e) => handleEditItem(e as any, false)}
                      disabled={saving}
                      className="text-sm"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      type="button" 
                      onClick={(e) => handleEditItem(e as any, true)}
                      disabled={saving}
                      className="text-sm"
                    >
                      {saving ? 'Saving...' : 'Save & Continue'}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Modal */}
      <Dialog open={showBulkEditModal} onOpenChange={setShowBulkEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItems.size} Items</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkEdit} className="space-y-4">
            <div>
              <Label>Field to Edit</Label>
              <Select value={bulkEditField} onValueChange={setBulkEditField}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="genre">Genre</SelectItem>
                  <SelectItem value="subgenre">Subgenre</SelectItem>
                  <SelectItem value="audio_type">Audio Type</SelectItem>
                  <SelectItem value="instrument_type">Instrument Type</SelectItem>
                  <SelectItem value="mood">Mood</SelectItem>
                  <SelectItem value="tempo_category">Tempo Category</SelectItem>
                  <SelectItem value="distribution_type">Distribution Type</SelectItem>
                  <SelectItem value="license_type">License Type</SelectItem>
                  <SelectItem value="is_ready">Is Ready</SelectItem>
                  <SelectItem value="is_new">Is New</SelectItem>
                  <SelectItem value="tags">Tags</SelectItem>
                  <SelectItem value="additional_subgenres">Additional Subgenres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>New Value</Label>
              {bulkEditField === 'is_ready' || bulkEditField === 'is_new' ? (
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select value" />
                        </SelectTrigger>
                        <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
              ) : bulkEditField === 'distribution_type' ? (
                <Select value={bulkEditValue} onValueChange={setBulkEditValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select distribution type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                      <Input
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  placeholder={`Enter new ${bulkEditField} value`}
                />
                  )}
                </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowBulkEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={bulkEditing || !bulkEditField}>
                {bulkEditing ? 'Updating...' : 'Update Items'}
              </Button>
            </DialogFooter>
          </form>
          </DialogContent>
        </Dialog>
    </div>
  )
} 