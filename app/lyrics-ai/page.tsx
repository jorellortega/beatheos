"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AITextEditor } from '@/components/lyrics-ai/AITextEditor'
import { TextToSpeech } from '@/components/lyrics-ai/TextToSpeech'
import { FileImport } from '@/components/lyrics-ai/FileImport'
import { InlineEditor } from '@/components/lyrics-ai/InlineEditor'
import { StatusBadge } from '@/components/lyrics-ai/StatusBadge'
import { GenreEditDialog } from '@/components/lyrics-ai/GenreEditDialog'
import { ArrangementSidebar } from '@/components/lyrics-ai/ArrangementSidebar'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Copy, 
  Download,
  History,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
  Upload,
  Music,
  Mic,
  Zap,
  Play,
  Square,
  Edit3
} from 'lucide-react'
import { SimpleLyricsSession, CreateLyricsData, UpdateLyricsData } from '@/lib/lyrics-simple-service'
import { useToast } from '@/hooks/use-toast'

export default function LyricsAIPage() {
  const { user, getAccessToken } = useAuth()
  const { toast } = useToast()
  const [lyrics, setLyrics] = useState<SimpleLyricsSession[]>([])
  const [selectedLyrics, setSelectedLyrics] = useState<SimpleLyricsSession | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [showAITextEditor, setShowAITextEditor] = useState(false)
  const [showTextToSpeech, setShowTextToSpeech] = useState(false)
  const [showFileImport, setShowFileImport] = useState(false)
  const [showNewLyricsDialog, setShowNewLyricsDialog] = useState(false)
  const [newLyricsName, setNewLyricsName] = useState('')
  const [newLyricsGenre, setNewLyricsGenre] = useState('')
  const [newLyricsDescription, setNewLyricsDescription] = useState('')

  const musicGenres = [
    'Hip-Hop',
    'Rap',
    'Pop',
    'Rock',
    'R&B',
    'Country',
    'Jazz',
    'Blues',
    'Electronic',
    'EDM',
    'Reggae',
    'Folk',
    'Alternative',
    'Indie',
    'Punk',
    'Metal',
    'Classical',
    'Gospel',
    'Soul',
    'Funk',
    'Disco',
    'House',
    'Techno',
    'Trap',
    'Drill',
    'Afrobeat',
    'Latin',
    'Reggaeton',
    'K-Pop',
    'Ambient',
    'Experimental',
    'Other'
  ]
  const [aiEditSelectedText, setAiEditSelectedText] = useState('')
  const [showGenreEdit, setShowGenreEdit] = useState(false)
  const [editingGenreFor, setEditingGenreFor] = useState<string | null>(null)
  const [showArrangementSidebar, setShowArrangementSidebar] = useState(true)
  const [currentArrangement, setCurrentArrangement] = useState<any[]>([])
  const [lockedSections, setLockedSections] = useState<any[]>([])
  const [highlightedSection, setHighlightedSection] = useState<{ startLine: number; endLine: number } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null)
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    elevenlabs: ''
  })

  // Load user's content on mount
  useEffect(() => {
    if (user) {
      loadContent()
      loadAPIKeys()
    }
  }, [user])

  const loadAPIKeys = async () => {
    try {
      // Get the auth token from localStorage
      const authToken = localStorage.getItem('beatheos-auth-token')
      if (!authToken) {
        console.error('No auth token found')
        return
      }

      const authData = JSON.parse(authToken)
      const response = await fetch('/api/lyrics-ai/get-ai-keys', {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setApiKeys({
          openai: data.openai || '',
          anthropic: data.anthropic || '',
          elevenlabs: data.elevenlabs || ''
        })
      } else {
        console.error('Failed to load API keys:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const loadContent = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Load lyrics
      const lyricsResponse = await fetch('/api/lyrics-ai/lyrics', {
        headers
      })
      if (lyricsResponse.ok) {
        const lyricsData = await lyricsResponse.json()
        setLyrics(lyricsData.lyrics || [])
      }
    } catch (error) {
      console.error('Error loading content:', error)
      toast({
        title: "Error loading content",
        description: "Failed to load your content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createNewAsset = async (data: CreateLyricsData) => {
    if (!user) return

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      const response = await fetch('/api/lyrics-ai/assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create asset')

      const result = await response.json()
      setLyrics(prev => [result.asset, ...prev])
      setSelectedLyrics(result.asset)
      
      toast({
        title: "Content created",
        description: `"${data.title}" has been created successfully`
      })
    } catch (error) {
      console.error('Error creating asset:', error)
      toast({
        title: "Error creating content",
        description: "Failed to create new content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const updateAsset = async (assetId: string, updates: Partial<UpdateLyricsData>) => {
    if (!user) return

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      console.log('Updating asset:', assetId, 'with updates:', updates)

      const response = await fetch(`/api/lyrics-ai/assets/${assetId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Update failed:', response.status, errorText)
        throw new Error(`Failed to update asset: ${response.status}`)
      }

      const result = await response.json()
      console.log('Update result:', result)
      setLyrics(prev => prev.map(lyric => 
        lyric.id === assetId ? result.asset : lyric
      ))
      
      if (selectedLyrics?.id === assetId) {
        setSelectedLyrics(result.asset)
        // Update arrangement when lyrics content changes
        if (updates.lyrics) {
          setCurrentArrangement([]) // Reset to trigger re-parsing
        }
      }
    } catch (error) {
      console.error('Error updating asset:', error)
      toast({
        title: "Error updating content",
        description: "Failed to update content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const updateLyricsStatus = async (lyricsId: string, newStatus: string) => {
    if (!user) return

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      const response = await fetch(`/api/lyrics-ai/assets/${lyricsId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Status update failed:', response.status, errorText)
        throw new Error(`Failed to update status: ${response.status}`)
      }

      const result = await response.json()
      
      // Update lyrics array
      setLyrics(prev => prev.map(lyric => 
        lyric.id === lyricsId ? result.asset : lyric
      ))
      
      // Update selected lyrics if it matches
      if (selectedLyrics?.id === lyricsId) {
        setSelectedLyrics(result.asset)
      }

      toast({
        title: "Status updated",
        description: `Status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    }
  }

  const updateLyricsGenre = async (lyricsId: string, newGenre: string) => {
    if (!user) return

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      const response = await fetch(`/api/lyrics-ai/assets/${lyricsId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lyrics_genre: newGenre })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Genre update failed:', response.status, errorText)
        throw new Error(`Failed to update genre: ${response.status}`)
      }

      const result = await response.json()
      
      // Update lyrics array
      setLyrics(prev => prev.map(lyric => 
        lyric.id === lyricsId ? result.asset : lyric
      ))
      
      // Update selected lyrics if it matches
      if (selectedLyrics?.id === lyricsId) {
        setSelectedLyrics(result.asset)
      }

      toast({
        title: "Genre updated",
        description: `Genre changed to ${newGenre}`,
      })
    } catch (error) {
      console.error('Error updating genre:', error)
      toast({
        title: "Error updating genre",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      })
    }
  }

  const handleGenreEdit = (lyricsId: string) => {
    setEditingGenreFor(lyricsId)
    setShowGenreEdit(true)
  }

  const handleGenreSave = (newGenre: string) => {
    if (editingGenreFor) {
      updateLyricsGenre(editingGenreFor, newGenre)
    }
    setShowGenreEdit(false)
    setEditingGenreFor(null)
  }

  const insertSongStructure = (element: string) => {
    if (!selectedLyrics) return

    const currentContent = selectedLyrics.lyrics || ''
    
    console.log('=== INSERT SONG STRUCTURE DEBUG ===')
    console.log('Element:', element)
    console.log('Current content:', currentContent)
    
    // First, clean up any duplicate sections
    const cleanedContent = cleanDuplicateSections(currentContent)
    console.log('Cleaned content:', cleanedContent)
    
    // Count existing sections of this type to determine the next number
    // Look for patterns like [Verse 1], [Hook 2], etc.
    const sectionPattern = new RegExp(`\\[${element}\\s+\\d+\\]`, 'gi')
    const existingSections = (cleanedContent.match(sectionPattern) || []).length
    
    console.log('Section pattern:', sectionPattern)
    console.log('Existing sections found:', cleanedContent.match(sectionPattern))
    console.log('Existing sections count:', existingSections)
    
    const nextNumber = existingSections + 1
    console.log('Next number will be:', nextNumber)
    
    // Create the section marker with number
    const sectionMarker = `[${element} ${nextNumber}]\n\n`
    
    let newContent: string
    if (element.toLowerCase() === 'intro') {
      // For Intro sections, add at the very beginning
      newContent = sectionMarker + cleanedContent
    } else if (element.toLowerCase() === 'outro') {
      // For Outro sections, add at the very end
      newContent = cleanedContent + sectionMarker
    } else {
      // For other sections (Verse, Hook, Bridge), add before any existing Outro
      const outroPattern = /(\[Outro\s+\d+\][\s\S]*)$/
      const outroMatch = cleanedContent.match(outroPattern)
      
      if (outroMatch) {
        // There's an existing outro, insert before it
        const beforeOutro = cleanedContent.substring(0, outroMatch.index)
        const outroSection = outroMatch[1]
        newContent = beforeOutro + sectionMarker + outroSection
        console.log('Inserting before existing Outro')
      } else {
        // No existing outro, add at the end
        newContent = cleanedContent + sectionMarker
        console.log('No existing Outro, adding at end')
      }
    }
    
    console.log('Section marker to add:', sectionMarker)
    const placement = element.toLowerCase() === 'intro' ? 'TOP (Intro)' : 
                     element.toLowerCase() === 'outro' ? 'BOTTOM (Outro)' : 
                     'BEFORE_OUTRO (Other)'
    console.log('Placement:', placement)
    console.log('New content will be:', newContent)
    console.log('=== END DEBUG ===')
    
    updateAsset(selectedLyrics.id, { lyrics: newContent })
    
    // Force arrangement update
    setTimeout(() => {
      setCurrentArrangement([])
    }, 100)
  }

  const cleanDuplicateSections = (content: string) => {
    console.log('=== CLEANUP DEBUG ===')
    console.log('Original content:', content)
    
    // Find all section markers in the content
    const sectionPattern = /\[(\w+)\s+(\d+)\]/g
    const allMatches = [...content.matchAll(sectionPattern)]
    
    console.log('All section matches found:', allMatches.map(m => m[0]))
    
    // Track seen sections
    const seenSections = new Set<string>()
    let cleanedContent = content
    
    // Process matches in reverse order to avoid index shifting
    for (let i = allMatches.length - 1; i >= 0; i--) {
      const match = allMatches[i]
      const fullMatch = match[0] // e.g., "[Verse 1]"
      const sectionType = match[1] // e.g., "Verse"
      const number = match[2] // e.g., "1"
      const sectionKey = `${sectionType} ${number}`
      
      console.log(`Processing: ${fullMatch} -> key: ${sectionKey}`)
      
      if (seenSections.has(sectionKey)) {
        console.log(`REMOVING duplicate: ${fullMatch}`)
        // Remove this duplicate section
        const beforeMatch = cleanedContent.substring(0, match.index)
        const afterMatch = cleanedContent.substring(match.index! + fullMatch.length)
        cleanedContent = beforeMatch + afterMatch
      } else {
        console.log(`KEEPING first occurrence: ${fullMatch}`)
        seenSections.add(sectionKey)
      }
    }
    
    console.log('Cleaned content:', cleanedContent)
    console.log('=== END CLEANUP DEBUG ===')
    
    return cleanedContent
  }

  const updateArrangement = async (arrangement: any[]) => {
    if (!selectedLyrics) return

    // Debounce the API call to prevent excessive requests
    const timeoutId = setTimeout(async () => {
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('No access token')

        const response = await fetch(`/api/lyrics-ai/assets/${selectedLyrics.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ lyrics_arrangement: arrangement })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Arrangement update failed:', response.status, errorText)
          throw new Error(`Failed to update arrangement: ${response.status}`)
        }

        const result = await response.json()
        
        // Update lyrics array
        setLyrics(prev => prev.map(lyric => 
          lyric.id === selectedLyrics.id ? result.asset : lyric
        ))
        
        // Update selected lyrics
        setSelectedLyrics(result.asset)
      } catch (error) {
        console.error('Error updating arrangement:', error)
        toast({
          title: "Error updating arrangement",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive"
        })
      }
    }, 500) // 500ms debounce

    // Clear previous timeout if it exists
    return () => clearTimeout(timeoutId)
  }

  const deleteAsset = async (assetId: string) => {
    if (!user) return

    try {
      const token = await getAccessToken()
      if (!token) throw new Error('No access token')

      const response = await fetch(`/api/lyrics-ai/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete asset')

      setLyrics(prev => prev.filter(lyric => lyric.id !== assetId))
      
      if (selectedLyrics?.id === assetId) {
        setSelectedLyrics(null)
      }
      
      toast({
        title: "Content deleted",
        description: "Content has been deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting asset:', error)
      toast({
        title: "Error deleting content",
        description: "Failed to delete content. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleAIGenerate = async (params: any): Promise<string> => {
    const response = await fetch('/api/lyrics-ai/generate-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate text')
    }

    const result = await response.json()
    return result.generatedText
  }

  const handleLockSection = (start: number, end: number, text: string) => {
    const newSection: LockedSection = {
      id: `locked-${Date.now()}`,
      start,
      end,
      text,
      locked_at: new Date()
    }
    setLockedSections(prev => [...prev, newSection])
  }

  const handleUnlockSection = (sectionId: string) => {
    setLockedSections(prev => prev.filter(section => section.id !== sectionId))
  }

  const handleHighlightSection = (startLine: number, endLine: number) => {
    console.log('Highlighting section:', { startLine, endLine })
    setHighlightedSection({ startLine, endLine })
    
    // Don't auto-clear - let user manually clear it
  }

  const handleClearHighlight = () => {
    console.log('Clearing highlighted section')
    setHighlightedSection(null)
  }

  const handleAIGenerateSection = async (section: any) => {
    console.log('=== AI GENERATE SECTION DEBUG ===')
    console.log('Section received:', section)
    console.log('Selected lyrics:', selectedLyrics)
    console.log('API Keys available:', { openai: !!apiKeys.openai, anthropic: !!apiKeys.anthropic })
    
    if (!selectedLyrics) {
      console.log('ERROR: No selected lyrics')
      return
    }

    try {
      // Set up the AI generation with context
      const fullContent = selectedLyrics.lyrics || ''
      console.log('Full content length:', fullContent.length)
      console.log('Section details:', {
        type: section.type,
        startLine: section.startLine,
        endLine: section.endLine,
        currentContent: section.content
      })
      
      const sectionPrompt = `Generate new ${section.type} content for this song. The ${section.type} should fit the style and theme of the full song.`
      
      const contextPrompt = `${sectionPrompt}

CONTEXT - Full song lyrics for reference:
${fullContent}

TASK - Generate new content for this ${section.type} section.`

      console.log('Context prompt length:', contextPrompt.length)
      console.log('API request payload:', {
        prompt: contextPrompt.substring(0, 200) + '...',
        service: 'openai',
        hasApiKey: !!apiKeys.openai,
        contentType: 'lyrics'
      })

      // Call the AI generation API
      console.log('Making API request to /api/lyrics-ai/generate-text')
      const response = await fetch('/api/lyrics-ai/generate-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: contextPrompt,
          service: 'openai',
          apiKey: apiKeys.openai,
          contentType: 'lyrics'
        }),
      })

      console.log('API response status:', response.status)
      console.log('API response ok:', response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.log('API error response:', errorText)
        throw new Error(`Failed to generate content: ${response.status} ${errorText}`)
      }

      const data = await response.json()
      console.log('API response data:', data)
      console.log('API response keys:', Object.keys(data))
      console.log('data.generatedText:', data.generatedText)
      console.log('data.text:', data.text)
      console.log('data.success:', data.success)
      
      const generatedContent = data.generatedText || data.text || ''
      console.log('Generated content length:', generatedContent.length)
      console.log('Generated content preview:', generatedContent.substring(0, 200) + '...')

      if (generatedContent) {
        // Replace the section content with the generated text
        const lines = fullContent.split('\n')
        console.log('Original lines count:', lines.length)
        console.log('Section lines before replacement:', lines.slice(section.startLine, section.endLine + 1))
        
        const newLines = [...lines]
        const sectionLines = generatedContent.split('\n')
        console.log('New section lines:', sectionLines)
        
        // Replace the section content (keep the section marker)
        const linesToReplace = section.endLine - section.startLine
        console.log('Lines to replace:', linesToReplace)
        console.log('Replacing from line', section.startLine + 1, 'to', section.endLine)
        
        newLines.splice(section.startLine + 1, linesToReplace, ...sectionLines)
        console.log('New lines count after replacement:', newLines.length)
        console.log('New section lines after replacement:', newLines.slice(section.startLine, section.startLine + sectionLines.length + 1))
        
        const updatedLyrics = newLines.join('\n')
        console.log('Updated lyrics length:', updatedLyrics.length)
        
        // Update the lyrics
        console.log('Calling updateAsset with ID:', selectedLyrics.id)
        updateAsset(selectedLyrics.id, { lyrics: updatedLyrics })
        
        toast({
          title: "Section Generated",
          description: `New ${section.type} content has been generated and added to your song.`,
        })
        console.log('=== AI GENERATE SECTION SUCCESS ===')
      } else {
        console.log('ERROR: No generated content received')
        toast({
          title: "Generation Failed",
          description: "No content was generated. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('=== AI GENERATE SECTION ERROR ===')
      console.error('Error details:', error)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      toast({
        title: "Generation Failed",
        description: `Failed to generate new section content: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleAIEditSection = (startLine: number, endLine: number) => {
    if (!selectedLyrics?.lyrics) return
    
    const lines = selectedLyrics.lyrics.split('\n')
    const sectionText = lines.slice(startLine, endLine + 1).join('\n')
    
    console.log('AI Edit for section:', sectionText)
    setAiEditSelectedText(sectionText)
    setShowAITextEditor(true)
  }

  const handleTextSelection = (text: string, start: number, end: number) => {
    if (!editMode) return
    
    console.log('Text selection received:', { text, start, end, editMode })
    setSelectedText(text)
    setSelectionRange({ start, end })
  }

  const handleAIReplace = () => {
    console.log('AI Replace clicked:', { selectedText, selectionRange })
    if (!selectedText.trim() || !selectionRange) {
      console.log('AI Replace blocked - no text or range')
      return
    }
    
    console.log('Setting AI edit text:', selectedText)
    setAiEditSelectedText(selectedText)
    setShowAITextEditor(true)
  }

  const handleAISave = (newText: string) => {
    if (!selectedLyrics || !selectionRange) return
    
    const currentContent = selectedLyrics.lyrics || ''
    const beforeSelection = currentContent.substring(0, selectionRange.start)
    const afterSelection = currentContent.substring(selectionRange.end)
    const updatedContent = beforeSelection + newText + afterSelection
    
    updateAsset(selectedLyrics.id, { lyrics: updatedContent })
    
    // Clear selection
    setSelectedText('')
    setSelectionRange(null)
    setShowAITextEditor(false)
  }

  const handleCreateNewLyrics = () => {
    if (!newLyricsName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your lyrics",
        variant: "destructive"
      })
      return
    }

    createNewAsset({
      name: newLyricsName.trim(),
      lyrics_content_type: 'lyrics',
      lyrics: '',
      lyrics_genre: newLyricsGenre.trim() || undefined,
      lyrics_description: newLyricsDescription.trim() || undefined
    })

    // Reset form and close dialog
    setNewLyricsName('')
    setNewLyricsGenre('')
    setNewLyricsDescription('')
    setShowNewLyricsDialog(false)
  }

  const filteredLyrics = lyrics.filter(lyric => {
    const matchesSearch = (lyric.lyrics_title || lyric.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
      lyric.lyrics?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || (lyric.status || 'draft') === selectedStatus
    return matchesSearch && matchesStatus
  })

  // Get status counts for tabs
  const getStatusCount = (status: string, items: SimpleLyricsSession[]) => {
    if (status === 'all') return items.length
    return items.filter(item => (item.status || 'draft') === status).length
  }

  const statusTabs = [
    { value: 'all', label: 'All', count: getStatusCount('all', lyrics) },
    { value: 'draft', label: 'Draft', count: getStatusCount('draft', lyrics) },
    { value: 'in-progress', label: 'In Progress', count: getStatusCount('in-progress', lyrics) },
    { value: 'review', label: 'Review', count: getStatusCount('review', lyrics) },
    { value: 'completed', label: 'Completed', count: getStatusCount('completed', lyrics) },
    { value: 'archived', label: 'Archived', count: getStatusCount('archived', lyrics) }
  ]

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in to access Lyrics AI</h1>
          <p className="text-muted-foreground">You need to be logged in to use the lyrics AI features.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Lyrics AI</h1>
          <p className="text-muted-foreground">Create, edit, and enhance your creative writing with AI</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showFileImport} onOpenChange={setShowFileImport}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-auto">
              <DialogHeader>
                <DialogTitle>Import Content</DialogTitle>
              </DialogHeader>
              <FileImport
                onImport={(content, title, contentType) => {
                  createNewAsset({
                    name: title,
                    lyrics: content,
                    lyrics_content_type: contentType as ContentType
                  })
                  setShowFileImport(false)
                }}
              />
            </DialogContent>
          </Dialog>

          <Button onClick={() => setShowNewLyricsDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Lyrics
          </Button>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${showArrangementSidebar ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Content Type - Lyrics Only */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span className="font-medium text-primary">Lyrics</span>
            </div>
          </div>

          {/* Status Tabs */}
          <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all" className="text-xs">
                All ({statusTabs[0].count})
              </TabsTrigger>
              <TabsTrigger value="draft" className="text-xs">
                Draft ({statusTabs[1].count})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="text-xs">
                Progress ({statusTabs[2].count})
              </TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-3 mt-2">
              <TabsTrigger value="review" className="text-xs">
                Review ({statusTabs[3].count})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">
                Done ({statusTabs[4].count})
              </TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">
                Archived ({statusTabs[5].count})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Lyrics 
                <Badge variant="secondary" className="ml-2">
                  {filteredLyrics.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : (
                filteredLyrics.map((lyric) => (
                  <div
                    key={lyric.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLyrics?.id === lyric.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedLyrics(lyric)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium truncate">{lyric.lyrics_title || lyric.name}</h4>
                      <div className="flex items-center gap-2">
                        <StatusBadge 
                          status={lyric.status || 'draft'} 
                          onStatusChange={(newStatus) => updateLyricsStatus(lyric.id, newStatus)}
                          className="text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAsset(lyric.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lyric.lyrics}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {lyric.lyrics_genre ? (
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGenreEdit(lyric.id)
                          }}
                        >
                          {lyric.lyrics_genre}
                        </Badge>
                      ) : (
                        <Badge 
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGenreEdit(lyric.id)
                          }}
                        >
                          + Add Genre
                        </Badge>
                      )}
                      {lyric.lyrics_mood && <Badge variant="outline" className="text-xs">{lyric.lyrics_mood}</Badge>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className={`space-y-6 ${showArrangementSidebar ? 'lg:col-span-2' : 'lg:col-span-2'}`}>
          {selectedLyrics ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <InlineEditor
                      value={selectedLyrics?.lyrics_title || selectedLyrics?.name || ''}
                      onChange={(value) => {
                        if (selectedLyrics) {
                          updateAsset(selectedLyrics.id, { lyrics_title: value })
                        }
                      }}
                      onSave={() => {}}
                      onCancel={() => {}}
                      field="title"
                      placeholder="Enter title..."
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Edit Mode Toggle */}
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setEditMode(!editMode)
                        setSelectedText('')
                        setSelectionRange(null)
                      }}
                      className="text-xs"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {editMode ? 'Exit Edit' : 'Edit Mode'}
                    </Button>

                    {/* AI Replace Button - only show when text is selected in edit mode */}
                    {editMode && selectedText.trim() && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAIReplace}
                        className="text-xs bg-blue-600 hover:bg-blue-700"
                        title={`Replace: "${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}"`}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Replace
                      </Button>
                    )}

                    {/* Arrangement Toggle */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowArrangementSidebar(!showArrangementSidebar)}
                      className="text-xs"
                    >
                      <Music className="h-3 w-3 mr-1" />
                      {showArrangementSidebar ? 'Hide' : 'Show'} Arrangement
                    </Button>

                    {/* Song Structure Actions */}
                    <div className="flex gap-1 mr-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertSongStructure('Intro')}
                        className="text-xs"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Intro
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertSongStructure('Verse')}
                        className="text-xs"
                      >
                        <Music className="h-3 w-3 mr-1" />
                        Verse
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertSongStructure('Hook')}
                        className="text-xs"
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Hook
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertSongStructure('Bridge')}
                        className="text-xs"
                      >
                        <Mic className="h-3 w-3 mr-1" />
                        Bridge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => insertSongStructure('Outro')}
                        className="text-xs"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Outro
                      </Button>
                    </div>

                    {/* Main Actions */}
                    <Dialog open={showAITextEditor} onOpenChange={(open) => {
                      setShowAITextEditor(open)
                      if (!open) {
                        // Clear selection when dialog closes
                        setSelectedText('')
                        setSelectionRange(null)
                        setAiEditSelectedText('')
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant={selectedText.trim() ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            console.log('AI Edit button clicked:', { selectedText, selectionRange, editMode })
                            // If we have selected text, use it for AI editing
                            if (selectedText.trim() && selectionRange) {
                              console.log('Using selected text for AI editing:', selectedText)
                              // Set the AI edit selected text to the current selected text
                              setAiEditSelectedText(selectedText)
                              console.log('Set aiEditSelectedText to:', selectedText)
                              setShowAITextEditor(true)
                            } else {
                              console.log('No selected text, opening editor normally')
                              // Otherwise, just open the editor normally
                              setShowAITextEditor(true)
                            }
                          }}
                          className={selectedText.trim() ? "bg-blue-600 hover:bg-blue-700" : ""}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {selectedText.trim() ? 'AI Replace Selected' : 'AI Edit'}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto mx-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center justify-between">
                            <span>AI Lyric Editor</span>
                            <span className="text-primary font-bold">BEATHEOS</span>
                          </DialogTitle>
                        </DialogHeader>
                        <AITextEditor
                          onGenerate={handleAIGenerate}
                          onSave={(text) => {
                            console.log('onSave called with text:', text, 'selectedLyrics:', selectedLyrics)
                            console.log('highlightedSection:', highlightedSection, 'aiEditSelectedText:', aiEditSelectedText, 'selectionRange:', selectionRange)
                            if (selectedLyrics) {
                              // If we have a highlighted section (from arrangement block click), replace just that section
                              if (highlightedSection) {
                                const lines = selectedLyrics.lyrics.split('\n')
                                const newLines = [...lines]
                                
                                // Replace the highlighted section with the AI-generated text
                                const aiLines = text.split('\n')
                                newLines.splice(highlightedSection.startLine, 
                                  highlightedSection.endLine - highlightedSection.startLine + 1, 
                                  ...aiLines)
                                
                                console.log('Replacing highlighted section:', highlightedSection, 'with AI text:', text)
                                updateAsset(selectedLyrics.id, { lyrics: newLines.join('\n') })
                                setHighlightedSection(null) // Clear highlight after editing
                              } else if (selectionRange) {
                                // Use the new AI replace functionality for text selection
                                console.log('Using selection range for replacement')
                                handleAISave(text)
                              } else {
                                // Replace entire content
                                console.log('Replacing entire content')
                                updateAsset(selectedLyrics.id, { lyrics: text })
                              }
                            } else {
                              console.error('No lyrics selected for saving')
                            }
                            setShowAITextEditor(false)
                            setAiEditSelectedText('') // Clear selected text
                          }}
                          selectedText={aiEditSelectedText}
                          fullContent={selectedLyrics?.lyrics || ''}
                          contentType={selectedLyrics?.lyrics_content_type || 'lyrics'}
                          lockedSections={lockedSections}
                          apiKeys={apiKeys}
                          service="openai"
                        />
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showTextToSpeech} onOpenChange={setShowTextToSpeech}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Volume2 className="h-4 w-4 mr-1" />
                          TTS
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Text to Speech</DialogTitle>
                        </DialogHeader>
                        <TextToSpeech
                          text={selectedLyrics?.lyrics || ''}
                          apiKey={apiKeys.elevenlabs}
                        />
                      </DialogContent>
                    </Dialog>

                    {/* New Lyrics Dialog */}
                    <Dialog open={showNewLyricsDialog} onOpenChange={setShowNewLyricsDialog}>
                      <DialogContent className="mx-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Lyrics</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="lyrics-name">Name *</Label>
                            <Input
                              id="lyrics-name"
                              placeholder="Enter lyrics name..."
                              value={newLyricsName}
                              onChange={(e) => setNewLyricsName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCreateNewLyrics()
                                }
                              }}
                            />
                          </div>
                          <div>
                            <Label htmlFor="lyrics-genre">Genre (optional)</Label>
                            <Select value={newLyricsGenre} onValueChange={setNewLyricsGenre}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a genre..." />
                              </SelectTrigger>
                              <SelectContent>
                                {musicGenres.map((genre) => (
                                  <SelectItem key={genre} value={genre}>
                                    {genre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="lyrics-description">Description (optional)</Label>
                            <Textarea
                              id="lyrics-description"
                              placeholder="Describe your lyrics..."
                              value={newLyricsDescription}
                              onChange={(e) => setNewLyricsDescription(e.target.value)}
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setNewLyricsName('')
                                setNewLyricsGenre('')
                                setNewLyricsDescription('')
                                setShowNewLyricsDialog(false)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button onClick={handleCreateNewLyrics}>
                              Create Lyrics
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedLyrics) {
                          deleteAsset(selectedLyrics.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Locked Sections */}
                  {lockedSections.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Locked Sections</h4>
                      <div className="space-y-1">
                        {lockedSections.map((section) => (
                          <div key={section.id} className="flex items-center justify-between text-sm">
                            <span className="text-yellow-700">"{section.text}"</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnlockSection(section.id)}
                            >
                              <Unlock className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Mode Indicator */}
                  {editMode && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">
                          Edit Mode: Select text to replace with AI
                        </span>
                        {selectedText.trim() && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                            Text Selected
                          </Badge>
                        )}
                      </div>
                      {selectedText.trim() && (
                        <div className="mt-2 p-2 bg-blue-100 rounded border">
                          <div className="text-xs text-blue-700 font-medium mb-1">Selected Text:</div>
                          <div className="text-sm text-blue-900 bg-white p-2 rounded border">
                            "{selectedText}"
                          </div>
                          <div className="mt-2 text-xs text-green-700 font-medium">
                            ✓ Ready for AI editing - click "AI Replace" button above
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content Editor */}
                  <div>
                    <InlineEditor
                      value={selectedLyrics?.lyrics || ''}
                      onChange={(value) => {
                        if (selectedLyrics) {
                          updateAsset(selectedLyrics.id, { lyrics: value })
                        }
                      }}
                      onSave={() => {}}
                      onCancel={() => {}}
                      field="content"
                      multiline
                      placeholder="Enter your content here..."
                      lockedSections={lockedSections}
                      onLockSection={handleLockSection}
                      onUnlockSection={handleUnlockSection}
                      highlightedSection={highlightedSection}
                      onClearHighlight={handleClearHighlight}
                      onAIEditSection={handleAIEditSection}
                      editMode={editMode}
                      onTextSelection={handleTextSelection}
                      selectedText={selectedText}
                      selectionRange={selectionRange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">No content selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select an item from the sidebar or create new content to get started.
                  </p>
                  <Button onClick={() => setShowNewLyricsDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Lyrics
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Arrangement Sidebar */}
        {showArrangementSidebar && (
          <div className="lg:col-span-1">
            <ArrangementSidebar
              key={selectedLyrics?.id || 'no-selection'}
              isOpen={showArrangementSidebar}
              onToggle={() => setShowArrangementSidebar(!showArrangementSidebar)}
              lyrics={selectedLyrics?.lyrics || ''}
              onUpdateArrangement={updateArrangement}
              onUpdateLyrics={(updatedLyrics) => {
                if (selectedLyrics) {
                  updateAsset(selectedLyrics.id, { lyrics: updatedLyrics })
                }
              }}
              onHighlightSection={handleHighlightSection}
              onAIGenerateSection={handleAIGenerateSection}
            />
          </div>
        )}
      </div>

      {/* Genre Edit Dialog */}
      <GenreEditDialog
        isOpen={showGenreEdit}
        onClose={() => {
          setShowGenreEdit(false)
          setEditingGenreFor(null)
        }}
        currentGenre={editingGenreFor ? lyrics.find(l => l.id === editingGenreFor)?.lyrics_genre || '' : ''}
        onSave={handleGenreSave}
      />
    </div>
  )
}

