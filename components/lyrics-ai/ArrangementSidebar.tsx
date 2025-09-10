"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Music, Play, Zap, Mic, Square, GripVertical, Trash2, Sparkles, X } from 'lucide-react'

interface ArrangementItem {
  type: 'intro' | 'verse' | 'hook' | 'bridge' | 'outro' | 'chorus'
  lines: number
  content: string
  startLine: number
  endLine: number
  sectionNumber: number
}

interface ArrangementSidebarProps {
  isOpen: boolean
  onToggle: () => void
  lyrics: string
  onUpdateArrangement: (arrangement: ArrangementItem[]) => void
  onUpdateLyrics?: (updatedLyrics: string) => void
  onHighlightSection?: (startLine: number, endLine: number) => void
  onAIGenerateSection?: (section: ArrangementItem) => void
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'intro': return <Play className="h-3 w-3" />
    case 'verse': return <Music className="h-3 w-3" />
    case 'hook': case 'chorus': return <Zap className="h-3 w-3" />
    case 'bridge': return <Mic className="h-3 w-3" />
    case 'outro': return <Square className="h-3 w-3" />
    default: return <Music className="h-3 w-3" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'intro': return 'bg-blue-500'
    case 'verse': return 'bg-green-500'
    case 'hook': case 'chorus': return 'bg-yellow-500'
    case 'bridge': return 'bg-purple-500'
    case 'outro': return 'bg-gray-500'
    default: return 'bg-gray-400'
  }
}

export function ArrangementSidebar({ isOpen, onToggle, lyrics, onUpdateArrangement, onUpdateLyrics, onHighlightSection, onAIGenerateSection }: ArrangementSidebarProps) {
  const [arrangement, setArrangement] = useState<ArrangementItem[]>([])
  const previousArrangementRef = useRef<ArrangementItem[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null)

  const parseLyricsToArrangement = (lyricsText: string): ArrangementItem[] => {
    if (!lyricsText) return []

    const lines = lyricsText.split('\n')
    const arrangement: ArrangementItem[] = []
    let currentSection: ArrangementItem | null = null
    const sectionCounts: Record<string, number> = {}

    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      
      // Check for section markers - both [Type] and (Type) formats, with or without numbers
      const sectionMatch = trimmedLine.match(/^[\[\(](intro|verse|hook|chorus|bridge|outro)(?:\s+\d+)?[\]\)]/i)
      
      if (sectionMatch) {
        // Save previous section if exists
        if (currentSection) {
          currentSection.endLine = index - 1
          arrangement.push(currentSection)
        }
        
        // Start new section
        const type = sectionMatch[1].toLowerCase() as ArrangementItem['type']
        
        // Increment count for this section type
        sectionCounts[type] = (sectionCounts[type] || 0) + 1
        
        currentSection = {
          type,
          lines: 0,
          content: '',
          startLine: index,
          endLine: index,
          sectionNumber: sectionCounts[type]
        }
      } else if (currentSection) {
        // Add line to current section (count all lines, including empty ones)
        if (trimmedLine) {
          currentSection.lines++
        }
        currentSection.content += (currentSection.content ? '\n' : '') + line
      }
    })

    // Add the last section
    if (currentSection) {
      currentSection.endLine = lines.length - 1
      arrangement.push(currentSection)
    }

    return arrangement
  }

  // Function to update lyrics content with numbered sections
  const updateLyricsWithNumbers = (lyricsText: string): string => {
    if (!lyricsText) return lyricsText

    const lines = lyricsText.split('\n')
    const sectionCounts: Record<string, number> = {}
    const updatedLines: string[] = []

    lines.forEach((line) => {
      const trimmedLine = line.trim()
      
      // Check for unnumbered section markers
      const sectionMatch = trimmedLine.match(/^[\[\(](intro|verse|hook|chorus|bridge|outro)[\]\)]/i)
      
      if (sectionMatch) {
        const type = sectionMatch[1].toLowerCase()
        const originalMarker = sectionMatch[0]
        
        // Increment count for this section type
        sectionCounts[type] = (sectionCounts[type] || 0) + 1
        
        // Replace with numbered version
        const numberedMarker = originalMarker.replace(
          new RegExp(`\\[${sectionMatch[1]}\\]`, 'i'),
          `[${sectionMatch[1]} ${sectionCounts[type]}]`
        )
        updatedLines.push(line.replace(originalMarker, numberedMarker))
      } else {
        updatedLines.push(line)
      }
    })

    return updatedLines.join('\n')
  }

  // Helper function to compare arrangements
  const arrangementsEqual = (a: ArrangementItem[], b: ArrangementItem[]): boolean => {
    if (a.length !== b.length) return false
    return a.every((item, index) => {
      const other = b[index]
      return item.type === other.type && 
             item.lines === other.lines && 
             item.content === other.content &&
             item.startLine === other.startLine &&
             item.endLine === other.endLine &&
             item.sectionNumber === other.sectionNumber
    })
  }

  useEffect(() => {
    const parsed = parseLyricsToArrangement(lyrics)
    
    // Check if lyrics contain unnumbered sections and update them
    const hasUnnumberedSections = lyrics.includes('[Intro]') || lyrics.includes('[Verse]') || 
                                 lyrics.includes('[Hook]') || lyrics.includes('[Bridge]') || 
                                 lyrics.includes('[Outro]') || lyrics.includes('[Chorus]')
    
    if (hasUnnumberedSections && onUpdateLyrics) {
      const updatedLyrics = updateLyricsWithNumbers(lyrics)
      if (updatedLyrics !== lyrics) {
        onUpdateLyrics(updatedLyrics)
        return // Exit early, the useEffect will run again with updated lyrics
      }
    }
    
    // Only update if the arrangement actually changed
    if (!arrangementsEqual(parsed, previousArrangementRef.current)) {
      setArrangement(parsed)
      previousArrangementRef.current = parsed
      onUpdateArrangement(parsed)
    }
  }, [lyrics, onUpdateArrangement, onUpdateLyrics])

  const handleSectionClick = (section: ArrangementItem, index: number) => {
    console.log('=== ARRANGEMENT SECTION CLICK DEBUG ===')
    console.log('Section clicked:', section)
    console.log('Index:', index)
    console.log('Current selectedSectionIndex:', selectedSectionIndex)
    console.log('Will toggle selection:', selectedSectionIndex === index ? 'DESELECT' : 'SELECT')
    
    setSelectedSectionIndex(selectedSectionIndex === index ? null : index)
    
    if (onHighlightSection) {
      console.log('Calling onHighlightSection with:', section.startLine, section.endLine)
      onHighlightSection(section.startLine, section.endLine)
    } else {
      console.log('onHighlightSection is not provided')
    }
    console.log('=== END ARRANGEMENT SECTION CLICK DEBUG ===')
  }

  const handleClearSection = (section: ArrangementItem, index: number) => {
    console.log('Clearing section:', section)
    const lines = lyrics.split('\n')
    const newLines = [...lines]
    
    // Clear the section content (keep the section marker)
    for (let i = section.startLine + 1; i <= section.endLine; i++) {
      if (newLines[i]) {
        newLines[i] = ''
      }
    }
    
    if (onUpdateLyrics) {
      onUpdateLyrics(newLines.join('\n'))
    }
    setSelectedSectionIndex(null)
  }

  const handleDeleteSection = (section: ArrangementItem, index: number) => {
    console.log('Deleting section:', section)
    const lines = lyrics.split('\n')
    const newLines = [...lines]
    
    // Remove the entire section including the marker
    newLines.splice(section.startLine, section.endLine - section.startLine + 1)
    
    if (onUpdateLyrics) {
      onUpdateLyrics(newLines.join('\n'))
    }
    setSelectedSectionIndex(null)
  }

  const handleAIGenerateSection = (section: ArrangementItem) => {
    console.log('=== ARRANGEMENT SIDEBAR AI GENERATE DEBUG ===')
    console.log('Section clicked for AI generation:', section)
    console.log('onAIGenerateSection callback available:', !!onAIGenerateSection)
    
    if (onAIGenerateSection) {
      console.log('Calling onAIGenerateSection with section:', section)
      onAIGenerateSection(section)
    } else {
      console.log('ERROR: onAIGenerateSection callback not provided')
    }
    setSelectedSectionIndex(null)
    console.log('=== END ARRANGEMENT SIDEBAR AI GENERATE DEBUG ===')
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', '')
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    // Reorder the arrangement
    const newArrangement = [...arrangement]
    const draggedItem = newArrangement[draggedIndex]
    
    // Remove the dragged item
    newArrangement.splice(draggedIndex, 1)
    
    // Insert it at the new position
    const newIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newArrangement.splice(newIndex, 0, draggedItem)
    
    // Update the arrangement
    setArrangement(newArrangement)
    onUpdateArrangement(newArrangement)
    
    // Update the lyrics content to match the new arrangement
    if (onUpdateLyrics) {
      const updatedLyrics = reorderLyricsContent(lyrics, newArrangement)
      onUpdateLyrics(updatedLyrics)
    }
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const reorderLyricsContent = (originalLyrics: string, newArrangement: ArrangementItem[]): string => {
    const lines = originalLyrics.split('\n')
    const reorderedLines: string[] = []
    
    // Add sections in the new order
    newArrangement.forEach(section => {
      // Add the section marker
      const sectionMarker = `[${section.type.charAt(0).toUpperCase() + section.type.slice(1)} ${section.sectionNumber}]`
      reorderedLines.push(sectionMarker)
      
      // Add the section content
      const sectionLines = section.content.split('\n')
      reorderedLines.push(...sectionLines)
      
      // Add spacing between sections
      reorderedLines.push('')
    })
    
    return reorderedLines.join('\n').trim()
  }

  if (!isOpen) {
    return (
      <div className="fixed right-0 top-1/2 transform -translate-y-1/2 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="rounded-l-lg rounded-r-none shadow-lg"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="w-80 bg-background border-l shadow-lg h-full overflow-y-auto">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Arrangement</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {arrangement.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No structure detected</p>
            <p className="text-xs">Add [Intro], [Verse], [Hook], etc. to see arrangement</p>
          </div>
        ) : (
          arrangement.map((section, index) => (
            <div key={`${section.type}-${section.sectionNumber}-${index}`} className="relative">
              <Card 
                className={`border-l-4 cursor-pointer hover:bg-muted/50 transition-all duration-200 ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                } ${
                  dragOverIndex === index ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
                } ${
                  selectedSectionIndex === index ? 'ring-2 ring-yellow-500 bg-yellow-50/50' : ''
                }`}
                style={{ borderLeftColor: getTypeColor(section.type).replace('bg-', '#') }}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onClick={() => handleSectionClick(section, index)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted/50 rounded"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                    </div>
                    {getTypeIcon(section.type)}
                    <CardTitle className="text-sm capitalize">
                      {section.type} {section.sectionNumber}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {section.lines} lines
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {section.content.split('\n').slice(0, 3).map((line, lineIndex) => (
                      <div key={lineIndex} className="truncate">
                        {line || '...'}
                      </div>
                    ))}
                    {section.content.split('\n').length > 3 && (
                      <div className="text-muted-foreground">...</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons - Show when section is selected */}
              {selectedSectionIndex === index && (
                <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-sm px-3 py-2 rounded-md shadow-lg font-medium z-30">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">Actions</span>
                    <div className="flex gap-1">
                      <button
                        className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-2 py-1 rounded text-xs font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearSection(section, index)
                        }}
                        title="Clear section content"
                      >
                        Clear
                      </button>
                      <button
                        className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSection(section, index)
                        }}
                        title="Delete entire section"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        onClick={(e) => {
                          console.log('=== AI GENERATE BUTTON CLICKED ===')
                          console.log('Event:', e)
                          console.log('Section:', section)
                          console.log('Stopping propagation')
                          e.stopPropagation()
                          console.log('Calling handleAIGenerateSection')
                          handleAIGenerateSection(section)
                          console.log('=== END AI GENERATE BUTTON CLICKED ===')
                        }}
                        title="AI generate section content"
                      >
                        <Sparkles className="h-3 w-3" />
                      </button>
                      <button
                        className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedSectionIndex(null)
                        }}
                        title="Close actions"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Summary */}
        {arrangement.length > 0 && (
          <Card className="mt-4">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium mb-2">Summary</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Total Sections:</span>
                  <span className="font-medium">{arrangement.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Lines:</span>
                  <span className="font-medium">{arrangement.reduce((sum, section) => sum + section.lines, 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Structure:</span>
                  <span className="font-medium">
                    {arrangement.map(s => s.type.charAt(0).toUpperCase()).join(' → ')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
