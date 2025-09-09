"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Sparkles, X, Save, RotateCcw } from 'lucide-react'
import { AIGenerationParams, LockedSection } from '@/types/lyrics'

interface AITextEditorProps {
  onGenerate: (params: AIGenerationParams) => Promise<string>
  onSave: (text: string) => void
  selectedText?: string
  fullContent?: string
  contentType: string
  lockedSections?: LockedSection[]
  apiKeys?: {
    openai: string
    anthropic: string
    elevenlabs: string
  }
  service?: 'openai' | 'anthropic'
}

export function AITextEditor({
  onGenerate,
  onSave,
  selectedText,
  fullContent,
  contentType,
  lockedSections = [],
  apiKeys = { openai: '', anthropic: '', elevenlabs: '' },
  service = 'openai'
}: AITextEditorProps) {
  const [prompt, setPrompt] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedService, setSelectedService] = useState<'openai' | 'anthropic'>(service)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedText, setGeneratedText] = useState('')
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [showQuickPrompts, setShowQuickPrompts] = useState(false)
  const [savedPrompts, setSavedPrompts] = useState<string[]>([])

  // Get the current API key based on selected service
  const getCurrentApiKey = () => {
    return selectedService === 'openai' ? apiKeys.openai : apiKeys.anthropic
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const quickPrompts = [
    'Improve the flow and rhythm',
    'Add more emotional depth',
    'Make it more catchy and memorable',
    'Add a bridge section',
    'Rewrite with different perspective',
    'Make it more commercial',
    'Add more descriptive imagery',
    'Simplify the language'
  ]

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt)
    setShowCustomPrompt(false)
  }

  const handleGenerate = async () => {
    const currentApiKey = getCurrentApiKey()
    if (!prompt.trim() || !currentApiKey.trim()) return

    setIsGenerating(true)
    try {
      const finalPrompt = showCustomPrompt ? customPrompt : prompt
      const result = await onGenerate({
        prompt: finalPrompt,
        selectedText,
        fullContent,
        service: selectedService,
        apiKey: currentApiKey,
        contentType,
        lockedSections
      })
      setGeneratedText(result)
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSavePrompt = () => {
    const promptToSave = showCustomPrompt ? customPrompt : prompt
    if (promptToSave.trim() && !savedPrompts.includes(promptToSave)) {
      setSavedPrompts([...savedPrompts, promptToSave])
    }
  }

  const handleUseGenerated = () => {
    console.log('handleUseGenerated called with text:', generatedText)
    onSave(generatedText)
    setGeneratedText('')
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Lyric Editor
          </div>
          <div className="text-primary font-bold">
            BEATHEOS
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section Editing Indicator */}
        {selectedText && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="font-medium text-yellow-800">Editing Selected Section</span>
            </div>
            <div className="text-sm text-yellow-700 mb-2">
              The AI will edit only the highlighted section below. The rest of your lyrics will remain unchanged.
            </div>
            <div className="p-3 bg-white border border-yellow-300 rounded text-sm font-mono text-gray-800 max-h-32 overflow-y-auto">
              {selectedText}
            </div>
          </div>
        )}

        {/* Service Selection */}
        <div className="grid grid-cols-2 gap-4">
          {!getCurrentApiKey() && (
            <div>
              <Label htmlFor="service">AI Service</Label>
              <Select value={selectedService} onValueChange={(value: 'openai' | 'anthropic') => setSelectedService(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className={getCurrentApiKey() ? 'col-span-2' : ''}>
            <Label>Status</Label>
            <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
              <div className={`w-2 h-2 rounded-full ${getCurrentApiKey() ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {getCurrentApiKey() ? 'AI Online' : 'AI Offline'}
              </span>
            </div>
            {!getCurrentApiKey() && (
              <p className="text-sm text-muted-foreground mt-1">
                Configure your API key in <a href="/setup-ai" className="text-primary hover:underline">AI Setup</a>
              </p>
            )}
          </div>
        </div>

        {/* Custom Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Custom Prompt</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCustomPrompt(!showCustomPrompt)}
            >
              {showCustomPrompt ? 'Hide' : 'Show'} Custom
            </Button>
          </div>
          
          {showCustomPrompt ? (
            <Textarea
              placeholder="Enter your custom prompt..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
            />
          ) : (
            <Input
              placeholder="Select a quick prompt or enter custom..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          )}
        </div>

        {/* Quick Prompts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Quick Prompts</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickPrompts(!showQuickPrompts)}
            >
              {showQuickPrompts ? 'Hide' : 'Show'} Quick Prompts
            </Button>
          </div>
          
          {showQuickPrompts && (
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((quickPrompt, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => handleQuickPrompt(quickPrompt)}
                >
                  {quickPrompt}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Saved Prompts */}
        {savedPrompts.length > 0 && (
          <div>
            <Label>Saved Prompts</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {savedPrompts.map((savedPrompt, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                  onClick={() => {
                    setPrompt(savedPrompt)
                    setShowCustomPrompt(false)
                  }}
                >
                  {savedPrompt}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSavedPrompts(savedPrompts.filter((_, i) => i !== index))
                    }}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Locked Sections Display */}
        {lockedSections.length > 0 && (
          <div>
            <Label>Locked Sections (will be preserved)</Label>
            <div className="space-y-1 mt-2">
              {lockedSections.map((section, index) => (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  <span className="font-medium">Section {index + 1}:</span> "{section.text}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim() || !getCurrentApiKey().trim()}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Text
            </>
          )}
        </Button>

        {/* Generated Text */}
        {generatedText && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                {selectedText ? 'Generated Replacement for Selected Section' : 'Generated Text'}
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSavePrompt}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Prompt
                </Button>
              </div>
            </div>
            <Textarea
              ref={textareaRef}
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleUseGenerated} className="flex-1">
                {selectedText ? 'Replace Selected Section' : 'Use This Text'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setGeneratedText('')}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

