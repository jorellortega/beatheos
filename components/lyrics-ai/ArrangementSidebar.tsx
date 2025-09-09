"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Music, Play, Zap, Mic, Square } from 'lucide-react'

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

export function ArrangementSidebar({ isOpen, onToggle, lyrics, onUpdateArrangement, onUpdateLyrics, onHighlightSection }: ArrangementSidebarProps) {
  const [arrangement, setArrangement] = useState<ArrangementItem[]>([])
  const previousArrangementRef = useRef<ArrangementItem[]>([])

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

  const handleSectionClick = (section: ArrangementItem) => {
    console.log('Arrangement section clicked:', section)
    if (onHighlightSection) {
      console.log('Calling onHighlightSection with:', section.startLine, section.endLine)
      onHighlightSection(section.startLine, section.endLine)
    } else {
      console.log('onHighlightSection is not provided')
    }
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
            <Card 
              key={index} 
              className="border-l-4 cursor-pointer hover:bg-muted/50 transition-colors" 
              style={{ borderLeftColor: getTypeColor(section.type).replace('bg-', '#') }}
              onClick={() => handleSectionClick(section)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
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
