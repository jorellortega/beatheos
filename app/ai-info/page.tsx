'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Plus, X, Loader2, Sparkles } from 'lucide-react'
import { AISetting } from '@/types/ai'
import { supabase } from '@/lib/supabaseClient'

interface PromptSection {
  id: string
  name: string
  content: string
}

export default function AIInfoPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [sections, setSections] = useState<PromptSection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check if user is admin or ceo
  const isAdminOrCEO = user && (user.role === 'admin' || user.role === 'ceo')

  // Redirect if not authenticated or not admin/ceo
  useEffect(() => {
    if (!authLoading && (!user || !isAdminOrCEO)) {
      router.push('/login')
    }
  }, [user, authLoading, router, isAdminOrCEO])

  // Load system prompt on mount
  useEffect(() => {
    if (user && isAdminOrCEO) {
      loadSystemPrompt()
    }
  }, [user, isAdminOrCEO])

  const loadSystemPrompt = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('ai_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'system_prompt')
        .maybeSingle()

      if (error) {
        throw error
      }

      const prompt = (data as AISetting | null)?.setting_value || ''
      setSections(parsePromptIntoSections(prompt))
    } catch (error) {
      console.error('Error loading system prompt:', error)
      setError('Failed to load system prompt')
      // Initialize with default section if loading fails
      if (sections.length === 0) {
        setSections([{ id: Date.now().toString(), name: '', content: '' }])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const parsePromptIntoSections = (prompt: string): PromptSection[] => {
    if (!prompt.trim()) {
      return [{ id: Date.now().toString(), name: '', content: '' }]
    }

    // Split by markdown headers (###) or double newlines
    const sections: PromptSection[] = []
    const lines = prompt.split('\n')
    let currentSection: { name: string; content: string[] } | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Check if line is a markdown header (###)
      const headerMatch = line.match(/^###\s+(.+)$/)
      
      if (headerMatch) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            id: (Date.now() + sections.length).toString(),
            name: currentSection.name,
            content: currentSection.content.join('\n').trim()
          })
        }
        // Start new section with header name
        currentSection = {
          name: headerMatch[1].trim(),
          content: []
        }
      } else {
        // If we have a current section, add line to it
        if (currentSection) {
          currentSection.content.push(line)
        } else {
          // No section yet, create one with empty name
          currentSection = {
            name: '',
            content: [line]
          }
        }
      }
    }

    // Save last section
    if (currentSection) {
      sections.push({
        id: (Date.now() + sections.length).toString(),
        name: currentSection.name,
        content: currentSection.content.join('\n').trim()
      })
    }

    // If no sections were created, treat entire prompt as one section
    if (sections.length === 0) {
      return [{ id: Date.now().toString(), name: '', content: prompt.trim() }]
    }

    return sections
  }

  const combineSectionsIntoPrompt = (sections: PromptSection[]): string => {
    return sections
      .filter(s => s.content.trim().length > 0)
      .map(s => {
        const name = s.name.trim()
        const content = s.content.trim()
        // If section has a name, use markdown header format
        if (name) {
          return `### ${name}\n\n${content}`
        }
        return content
      })
      .join('\n\n')
  }

  const handleAddSection = () => {
    setSections([...sections, { id: Date.now().toString(), name: '', content: '' }])
  }

  const handleRemoveSection = (id: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(s => s.id !== id))
    }
  }

  const handleUpdateSection = (id: string, content: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, content } : s))
  }

  const handleUpdateSectionName = (id: string, name: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, name } : s))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      const fullPrompt = combineSectionsIntoPrompt(sections)

      const { error } = await supabase
        .from('ai_settings')
        .upsert({
          setting_key: 'system_prompt',
          setting_value: fullPrompt,
          description: 'The system prompt that defines how Covion Intelligence behaves.',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        })

      if (error) {
        throw error
      }

      setSuccess('System prompt saved successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      console.error('Error saving system prompt:', error)
      setError('Failed to save system prompt')
    } finally {
      setIsSaving(false)
    }
  }

  const handleGeneratePrompt = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      setSuccess(null)

      const fullPrompt = combineSectionsIntoPrompt(sections)

      const response = await fetch('/api/generate-ai-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to generate prompt')
      }

      const data = await response.json()
      const improvedPrompt = data.prompt

      if (improvedPrompt) {
        setSections(parsePromptIntoSections(improvedPrompt))
        setSuccess('Prompt enhanced successfully!')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      console.error('Error generating prompt:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate prompt')
    } finally {
      setIsGenerating(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <main className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  if (!user || !isAdminOrCEO) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#141414] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-lg">
            <Settings className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">AI System Prompt Builder</h1>
            <p className="text-yellow-200 text-sm mt-1">
              Configure the system prompt that defines how the AI assistant behaves
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Prompt Sections */}
        <Card className="bg-black border-yellow-400 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-yellow-400 text-2xl">System Prompt</CardTitle>
              <Button
                onClick={handleAddSection}
                className="bg-yellow-400 text-black hover:bg-yellow-300"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section, index) => (
              <div key={section.id} className="space-y-2 p-4 border border-yellow-400/30 rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-white text-xs font-medium mb-1 block">
                      Section Name (optional)
                    </label>
                    <Input
                      value={section.name}
                      onChange={(e) => handleUpdateSectionName(section.id, e.target.value)}
                      placeholder={`Section ${index + 1}${section.name ? `: ${section.name}` : ''}`}
                      className="bg-gray-900 border-yellow-400/50 text-white placeholder:text-gray-500 focus:border-yellow-400"
                    />
                  </div>
                  {sections.length > 1 && (
                    <Button
                      onClick={() => handleRemoveSection(section.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 flex-shrink-0"
                      title="Remove section"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <label className="text-white text-xs font-medium mb-1 block">
                    Content
                  </label>
                  <Textarea
                    value={section.content}
                    onChange={(e) => handleUpdateSection(section.id, e.target.value)}
                    placeholder="Enter prompt section content..."
                    className="min-h-[120px] bg-gray-900 border-yellow-400/50 text-white resize-none focus:border-yellow-400"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Prompt'
            )}
          </Button>
          <Button
            onClick={handleGeneratePrompt}
            disabled={isSaving || isGenerating}
            variant="outline"
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/20 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enhance with AI
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  )
}

