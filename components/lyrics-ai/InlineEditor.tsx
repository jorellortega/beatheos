"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, Edit3, Lock, Unlock } from 'lucide-react'
import { LockedSection } from '@/types/lyrics'

interface HighlightedTextProps {
  text: string
  highlightedSection?: { startLine: number; endLine: number } | null
}

function HighlightedText({ text, highlightedSection }: HighlightedTextProps) {
  if (!highlightedSection) {
    return <span>{text}</span>
  }

  const lines = text.split('\n')
  const { startLine, endLine } = highlightedSection

  return (
    <span>
      {lines.map((line, index) => {
        const isHighlighted = index >= startLine && index <= endLine
        return (
          <span
            key={index}
            className={isHighlighted ? 'bg-yellow-200 text-yellow-900 px-1 rounded' : ''}
          >
            {line}
            {index < lines.length - 1 && '\n'}
          </span>
        )
      })}
    </span>
  )
}

interface InlineEditorProps {
  value: string
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
  field: 'title' | 'content' | 'version_name'
  multiline?: boolean
  placeholder?: string
  lockedSections?: LockedSection[]
  onLockSection?: (start: number, end: number, text: string) => void
  onUnlockSection?: (sectionId: string) => void
  highlightedSection?: { startLine: number; endLine: number } | null
  onClearHighlight?: () => void
  onAIEditSection?: (startLine: number, endLine: number) => void
}

export function InlineEditor({
  value,
  onChange,
  onSave,
  onCancel,
  field,
  multiline = false,
  placeholder,
  lockedSections = [],
  onLockSection,
  onUnlockSection,
  highlightedSection,
  onClearHighlight,
  onAIEditSection
}: InlineEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [selectedText, setSelectedText] = useState('')
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    console.log('InlineEditor highlightedSection changed:', highlightedSection)
  }, [highlightedSection])

  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.select()
        // Auto-resize on mount
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
    }
  }, [isEditing, multiline])

  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      // Auto-resize when value changes
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`
    }
  }, [editValue, isEditing, multiline])

  useEffect(() => {
    if (isEditing && multiline && textareaRef.current && highlightedSection) {
      console.log('Highlighting in edit mode:', highlightedSection)
      // Scroll to highlighted section when in edit mode
      const lines = editValue.split('\n')
      const startLine = highlightedSection.startLine
      
      if (startLine < lines.length) {
        // Calculate approximate scroll position
        const lineHeight = 20 // Approximate line height in pixels
        const scrollTop = startLine * lineHeight
        textareaRef.current.scrollTop = Math.max(0, scrollTop - 100) // Offset to show some context
      }
    }
  }, [highlightedSection, isEditing, multiline, editValue])

  const handleStartEdit = () => {
    setIsEditing(true)
    setEditValue(value)
  }

  const handleSave = () => {
    onChange(editValue)
    onSave()
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
    onCancel()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Enter' && e.ctrlKey && multiline) {
      e.preventDefault()
      handleSave()
    }
  }

  const handleTextSelection = () => {
    if (!multiline || !textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const text = textareaRef.current.value.substring(start, end)

    setSelectionStart(start)
    setSelectionEnd(end)
    setSelectedText(text)
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`
    }
  }

  const handleLockSelection = () => {
    if (selectedText.trim() && onLockSection) {
      onLockSection(selectionStart, selectionEnd, selectedText)
      setSelectedText('')
    }
  }

  const isTextSelected = selectedText.trim().length > 0
  const isSelectionLocked = lockedSections.some(section => 
    section.start <= selectionStart && section.end >= selectionEnd
  )

  if (isEditing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={editValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onSelect={handleTextSelection}
              placeholder={placeholder}
              rows={Math.max(8, editValue.split('\n').length + 2)}
              className={`pr-20 min-h-[200px] resize-y ${highlightedSection ? 'ring-4 ring-yellow-400 ring-opacity-75 border-2 border-yellow-400' : ''}`}
            />
            {isTextSelected && !isSelectionLocked && (
              <Button
                size="sm"
                variant="outline"
                className="absolute top-2 right-2"
                onClick={handleLockSelection}
              >
                <Lock className="h-4 w-4" />
              </Button>
            )}
            {/* Highlight indicator and actions for edit mode */}
            {highlightedSection && (
              <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-sm px-3 py-2 rounded-md shadow-lg font-medium z-30">
                <div className="flex items-center gap-2">
                  <span>📍 Lines {highlightedSection.startLine + 1}-{highlightedSection.endLine + 1}</span>
                  <div className="flex gap-1">
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Clear the highlighted section content
                        const lines = editValue.split('\n')
                        const newLines = [...lines]
                        for (let i = highlightedSection.startLine; i <= highlightedSection.endLine; i++) {
                          if (newLines[i]) {
                            newLines[i] = ''
                          }
                        }
                        setEditValue(newLines.join('\n'))
                      }}
                    >
                      Clear
                    </button>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Trigger AI edit for this section
                        if (onAIEditSection) {
                          onAIEditSection(highlightedSection.startLine, highlightedSection.endLine)
                        }
                      }}
                    >
                      AI Edit
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onClearHighlight) {
                          onClearHighlight()
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-20"
          />
        )}
        
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative">
      <div
        className="cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
        onClick={handleStartEdit}
      >
        {multiline ? (
          <div className="relative">
            <div className="whitespace-pre-wrap min-h-[200px] max-h-[600px] overflow-y-auto p-4 border rounded-lg bg-muted/20">
              {value ? (
                <HighlightedText 
                  text={value} 
                  highlightedSection={highlightedSection}
                />
              ) : (
                <span className="text-muted-foreground italic">{placeholder}</span>
              )}
            </div>
            {/* Action buttons for display mode */}
            {highlightedSection && (
              <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-sm px-3 py-2 rounded-md shadow-lg font-medium z-30">
                <div className="flex items-center gap-2">
                  <span>📍 Lines {highlightedSection.startLine + 1}-{highlightedSection.endLine + 1}</span>
                  <div className="flex gap-1">
                    <button
                      className="bg-yellow-500 hover:bg-yellow-600 text-yellow-900 px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Clear the highlighted section content
                        const lines = value.split('\n')
                        const newLines = [...lines]
                        for (let i = highlightedSection.startLine; i <= highlightedSection.endLine; i++) {
                          if (newLines[i]) {
                            newLines[i] = ''
                          }
                        }
                        onChange(newLines.join('\n'))
                      }}
                    >
                      Clear
                    </button>
                    <button
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        // Trigger AI edit for this section
                        if (onAIEditSection) {
                          onAIEditSection(highlightedSection.startLine, highlightedSection.endLine)
                        }
                      }}
                    >
                      AI Edit
                    </button>
                    <button
                      className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onClearHighlight) {
                          onClearHighlight()
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[1.5rem]">
            {value || (
              <span className="text-muted-foreground italic">{placeholder}</span>
            )}
          </div>
        )}
      </div>
      
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleStartEdit}
      >
        <Edit3 className="h-4 w-4" />
      </Button>

      {/* Locked Sections Overlay */}
      {multiline && lockedSections.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {lockedSections.map((section, index) => (
            <div
              key={section.id}
              className="absolute bg-yellow-200/30 border border-yellow-400 rounded"
              style={{
                top: `${(section.start / value.length) * 100}%`,
                height: `${((section.end - section.start) / value.length) * 100}%`,
                left: 0,
                right: 0,
              }}
            >
              <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs px-1 rounded-bl">
                Locked
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

