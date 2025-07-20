'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Brain } from 'lucide-react'

export default function AIPage() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return

    setIsLoading(true)
    setResponse('')

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock responses based on input
      const input = prompt.toLowerCase()
      let mockResponse = ''
      
      if (input.includes('hello') || input.includes('hi')) {
        mockResponse = 'Hi JOR! How can I help you today?'
      } else if (input.includes('corrido')) {
        mockResponse = 'Sure! Let\'s start making a Corrido. What story or theme would you like to focus on?'
      } else if (input.includes('beat') || input.includes('pattern')) {
        mockResponse = 'I can help you create a beat! What genre are you thinking - trap, house, or something else?'
      } else {
        mockResponse = `AI Response to: "${prompt}"`
      }
      
      setResponse(mockResponse)
    } catch (error) {
      setResponse('Error: Could not get response')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <main style={{ backgroundColor: '#141414', minHeight: '100vh', padding: '2rem' }}>
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-0">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-yellow-400 to-yellow-200 rounded-full">
              <Brain className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-4xl font-bold text-white">AI Assistant</h1>
          </div>
          <p className="text-yellow-200 text-lg">Your intelligent companion for music creation</p>
        </div>
      </div>

      <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
        <Card className="bg-black border-yellow-400 shadow-xl">
          <CardHeader>
            <CardTitle className="text-yellow-400 text-2xl text-center">AI Prompt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your prompt here..."
              className="min-h-[200px] bg-black border-yellow-400 text-white text-lg resize-none focus:border-yellow-300"
              disabled={isLoading}
            />
            
            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || isLoading}
              className="w-full bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold py-3 text-lg hover:scale-105 transition-all duration-300"
            >
              <Send className="w-5 h-5 mr-2" />
              {isLoading ? 'Processing...' : 'Send'}
            </Button>

            {response && (
              <div className="mt-8 p-6 bg-black rounded-xl border border-yellow-400">
                <h3 className="text-yellow-400 font-semibold mb-3 text-lg">Response:</h3>
                <p className="text-white whitespace-pre-wrap text-base leading-relaxed">{response}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <footer className="mt-12 text-center text-sm text-gray-500">
        <div className="mt-2">&copy; 2025 All rights reserved</div>
      </footer>
    </main>
  )
} 