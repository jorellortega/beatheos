'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Bot, User, X } from 'lucide-react'
import { AIMessage } from '@/types/ai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AIChat() {
  const { user, getAccessToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSentMessage, setHasSentMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    // Scroll only within the messages container, not the page
    if (messagesContainerRef.current) {
      // Use setTimeout to ensure DOM has fully updated
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 0)
    }
  }

  useEffect(() => {
    if (hasSentMessage) {
      scrollToBottom()
    }
  }, [messages, hasSentMessage, isLoading])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    // Check if user is authenticated
    if (!user) {
      setError('Please log in to use the AI chat')
      return
    }

    // Mark that we've sent a message - this will expand the chat
    if (!hasSentMessage) {
      setHasSentMessage(true)
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    // Add user message optimistically
    setMessages(prev => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Get conversation history (excluding system messages)
      const history: AIMessage[] = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Get access token
      const token = await getAccessToken()

      // Call API
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userInput,
          conversationHistory: history
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
      // Remove the user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
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

  const clearChat = () => {
    setMessages([])
    setHasSentMessage(false)
    setInput('')
    setError(null)
  }

  // Format message with clickable links using React components
  const formatMessageWithLinks = (content: string, messageId: string) => {
    if (!content) return null

    // Use messageId to create unique keys
    const keyPrefix = `msg-${messageId}`
    let keyCounter = 0
    const getNextKey = (type: string) => `${keyPrefix}-${type}-${keyCounter++}`

    const elements: React.ReactNode[] = []
    let lastIndex = 0

    // First, find all markdown links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match
    const links: Array<{ start: number; end: number; text: string; url: string }> = []

    while ((match = markdownLinkRegex.exec(content)) !== null) {
      links.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        url: match[2]
      })
    }

    // Format text with plain URLs converted to links (using shared key counter)
    const formatTextWithUrls = (text: string): React.ReactNode[] => {
      if (!text) return []

      const textElements: React.ReactNode[] = []
      const urlRegex = /(https?:\/\/[^\s]+)/g
      let textLastIndex = 0
      let urlMatch

      while ((urlMatch = urlRegex.exec(text)) !== null) {
        // Add text before URL
        if (urlMatch.index > textLastIndex) {
          const textBefore = text.substring(textLastIndex, urlMatch.index)
          // Split by newlines and add <br> tags
          const lines = textBefore.split('\n')
          lines.forEach((line, lineIndex) => {
            if (lineIndex > 0) {
              textElements.push(<br key={getNextKey('br')} />)
            }
            if (line) {
              textElements.push(<span key={getNextKey('text')}>{line}</span>)
            }
          })
        }

        // Add URL as link
        const url = urlMatch[1]
        textElements.push(
          <a
            key={getNextKey('url')}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 underline break-words"
          >
            {url}
          </a>
        )

        textLastIndex = urlMatch.index + urlMatch[0].length
      }

      // Add remaining text
      if (textLastIndex < text.length) {
        const textAfter = text.substring(textLastIndex)
        // Split by newlines and add <br> tags
        const lines = textAfter.split('\n')
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            textElements.push(<br key={getNextKey('br')} />)
          }
          if (line) {
            textElements.push(<span key={getNextKey('text')}>{line}</span>)
          }
        })
      }

      // If no URLs found, return text with newlines
      if (textElements.length === 0) {
        const lines = text.split('\n')
        const noUrlElements: React.ReactNode[] = []
        lines.forEach((line, index) => {
          if (index > 0) {
            noUrlElements.push(<br key={getNextKey('br')} />)
          }
          if (line) {
            noUrlElements.push(<span key={getNextKey('text')}>{line}</span>)
          }
        })
        return noUrlElements
      }

      return textElements
    }

    // Process content with links
    links.forEach((link, index) => {
      // Add text before link
      if (link.start > lastIndex) {
        const textBefore = content.substring(lastIndex, link.start)
        // Process plain URLs in text before link
        elements.push(...formatTextWithUrls(textBefore))
      }

      // Add link
      elements.push(
        <a
          key={getNextKey('link')}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 hover:text-yellow-300 underline break-words"
        >
          {link.text}
        </a>
      )

      lastIndex = link.end
    })

    // Add remaining text
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex)
      elements.push(...formatTextWithUrls(textAfter))
    }

    // If no markdown links, process entire content
    if (links.length === 0) {
      return formatTextWithUrls(content)
    }

    return elements
  }

  // Compact mode: show only input before first message
  if (!hasSentMessage) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-black border-2 border-yellow-400 rounded-lg shadow-xl overflow-hidden p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={user ? "Type your message..." : "Please log in to use the AI chat"}
              className="min-h-[60px] max-h-[120px] bg-gray-900 border-yellow-400/50 text-white resize-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 flex-1 rounded-lg"
              disabled={isLoading || !user}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading || !user}
              className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-4 h-[60px] w-[60px] rounded-lg flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          {error && (
            <div className="mt-2 bg-red-500/20 border border-red-500 rounded-lg px-4 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Expanded mode: show full chat with messages
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-black border-2 border-yellow-400 rounded-lg shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '600px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-black" />
            <h3 className="text-black font-semibold text-lg">AI Assistant</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([])
                setInput('')
                setError(null)
              }}
              className="text-black hover:bg-black/20 h-8 px-2"
            >
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setHasSentMessage(false)
                setMessages([])
                setInput('')
                setError(null)
              }}
              className="text-black hover:bg-black/20 h-8 w-8 p-0"
              title="Minimize chat"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="overflow-y-auto p-4 space-y-4 bg-gray-900"
          style={{ height: '384px', minHeight: '384px', maxHeight: '384px' }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-yellow-400 text-black'
                    : 'bg-gray-800 text-white border border-yellow-400/30'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm whitespace-pre-wrap">
                    {formatMessageWithLinks(message.content, message.id)}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                  <User className="w-5 h-5 text-black" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                <Bot className="w-5 h-5 text-black" />
              </div>
              <div className="bg-gray-800 text-white border border-yellow-400/30 rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg px-4 py-2 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-black border-t border-yellow-400/30 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={user ? "Type your message..." : "Please log in to use the AI chat"}
              className="min-h-[60px] max-h-[120px] bg-gray-900 border-yellow-400/50 text-white resize-none focus:border-yellow-400 flex-1 rounded-lg"
              disabled={isLoading || !user}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 px-4 h-[60px] w-[60px] rounded-lg flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

