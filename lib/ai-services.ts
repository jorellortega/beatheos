import { AIGenerationParams, SpeechParams, VoicesResponse, SpeechResponse } from '@/types/lyrics'

export interface GenerateImageRequest {
  prompt: string
  style?: string
  model: string
  apiKey: string
}

export interface AIResponse {
  success: boolean
  data?: {
    data: Array<{
      url?: string
      b64_json?: string
    }>
  }
  error?: string
}

export class OpenAIService {
  static async generateText(params: AIGenerationParams): Promise<string> {
    const { prompt, selectedText, fullContent, apiKey, contentType, lockedSections } = params

    // Build context-aware prompt
    let systemPrompt = `You are a professional ${contentType} writer. Generate high-quality content based on the user's request.`
    
    if (lockedSections && lockedSections.length > 0) {
      systemPrompt += `\n\nIMPORTANT: The following sections are locked and must NOT be modified:\n`
      lockedSections.forEach(section => {
        systemPrompt += `- "${section.text}"\n`
      })
      systemPrompt += `\nWork around these locked sections and maintain the overall flow and context.`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ]

    if (selectedText) {
      messages.push({
        role: 'user',
        content: `Selected text to work with: "${selectedText}"`
      })
    }

    if (fullContent) {
      messages.push({
        role: 'user',
        content: `Full content context: "${fullContent}"`
      })
    }

    console.log('=== OPENAI SERVICE DEBUG ===')
    console.log('Messages:', messages)
    console.log('API Key length:', apiKey?.length)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    console.log('OpenAI response status:', response.status)
    console.log('OpenAI response ok:', response.ok)

    if (!response.ok) {
      const error = await response.json()
      console.log('OpenAI error response:', error)
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    console.log('OpenAI response data:', data)
    console.log('OpenAI choices:', data.choices)
    console.log('OpenAI first choice:', data.choices?.[0])
    console.log('OpenAI message content:', data.choices?.[0]?.message?.content)
    
    const result = data.choices[0]?.message?.content || ''
    console.log('OpenAI final result length:', result.length)
    console.log('OpenAI final result:', result)
    console.log('=== END OPENAI SERVICE DEBUG ===')
    
    return result
  }

  static async generateImage(request: GenerateImageRequest): Promise<AIResponse> {
    try {
      console.log('🎬 DEBUG - OpenAI API request:', {
        promptLength: request.prompt.length,
        promptPreview: request.prompt.substring(0, 200) + '...',
        style: request.style,
        model: request.model
      })
      // Check if this is a GPT image model (gpt-image-1 or GPT-5 models)
      const isGPTImageModel = request.model === 'gpt-image-1' || request.model.startsWith('gpt-')
      
      if (isGPTImageModel) {
        // Use Responses API for GPT Image models
        console.log('🖼️ IMAGE GENERATION - Using GPT Image (Responses API)')
        console.log('🖼️ IMAGE GENERATION - Model:', request.model === 'gpt-image-1' ? 'gpt-4.1-mini (with image_generation tool)' : request.model)
        console.log('🖼️ IMAGE GENERATION - Prompt:', request.prompt)
        console.log('🖼️ IMAGE GENERATION - API Endpoint: /v1/responses')
        
        const requestBody: any = {
          model: request.model === 'gpt-image-1' ? 'gpt-4.1-mini' : request.model,
          input: `Create a visual image. ${request.style} style: ${request.prompt}. Generate the image now.`,
          tools: [{ type: "image_generation" }],
          tool_choice: { type: "image_generation" }, // Force the tool to be called
        }
        // Add GPT-5 specific parameters if using GPT-5 model
        if (request.model.startsWith('gpt-5')) {
          requestBody.reasoning_effort = 'none'
          requestBody.verbosity = 'medium'
          console.log('🖼️ IMAGE GENERATION - GPT-5 parameters:', {
            reasoning_effort: 'none',
            verbosity: 'medium'
          })
        }
        console.log('🖼️ IMAGE GENERATION - Request body:', JSON.stringify(requestBody, null, 2))
        const response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${request.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorJson: any = {}
          try {
            errorJson = JSON.parse(errorText)
          } catch {
            // If not JSON, use the text as is
          }
          
          const errorMessage = errorJson.error?.message || errorText || 'Unknown error'
          throw new Error(`API Error (${response.status}): ${errorMessage}`)
        }

        console.log('🖼️ IMAGE GENERATION - Response status:', response.status)
        
        const data = await response.json()
        
        console.log('🖼️ IMAGE GENERATION - Full response:', JSON.stringify(data, null, 2))
        
        // Extract image from response - check multiple possible locations
        let imageData = null
        
        // First, try to find image_generation_call in output
        const imageGenerationCall = data.output?.find((output: any) => output.type === "image_generation_call")
        if (imageGenerationCall) {
          imageData = imageGenerationCall.result
          console.log('🖼️ IMAGE GENERATION - Found image in image_generation_call')
        } else {
          // Check if there's a message with tool_calls
          const messageOutput = data.output?.find((output: any) => output.type === "message")
          if (messageOutput?.content) {
            // Look for tool calls in content
            for (const contentItem of messageOutput.content) {
              if (contentItem.type === "tool_call" && contentItem.tool_call?.type === "image_generation") {
                imageData = contentItem.tool_call.result
                console.log('🖼️ IMAGE GENERATION - Found image in tool_call')
                break
              }
            }
          }
          
          // Also check if there are tool_calls at the message level
          if (!imageData && messageOutput?.tool_calls) {
            const imageToolCall = messageOutput.tool_calls.find((tc: any) => tc.type === "image_generation")
            if (imageToolCall) {
              imageData = imageToolCall.result
              console.log('🖼️ IMAGE GENERATION - Found image in message tool_calls')
            }
          }
        }
        
        console.log('🖼️ IMAGE GENERATION - Image data found:', !!imageData)
        console.log('🖼️ IMAGE GENERATION - Output items:', data.output?.length || 0)
        
        if (imageData) {
          console.log('🖼️ IMAGE GENERATION - ✅ Successfully generated image using GPT Image (Responses API)')
          // Return in the same format as DALL-E for compatibility
          return { 
            success: true, 
            data: {
              data: [{
                url: `data:image/png;base64,${imageData}`,
                b64_json: imageData
              }]
            }
          }
        } else {
          console.error('🖼️ IMAGE GENERATION - ❌ No image data in response')
          console.error('🖼️ IMAGE GENERATION - Response structure:', JSON.stringify(data, null, 2))
          throw new Error('No image in response - model returned text instead of generating image. Try a different prompt or use DALL-E 3.')
        }
      } else {
        // Use Images API for DALL-E models
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${request.apiKey}`,
          },
          body: JSON.stringify({
            prompt: `${request.style} style: ${request.prompt}`,
            n: 1,
            size: "1024x1024",
            model: "dall-e-3",
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorJson: any = {}
          try {
            errorJson = JSON.parse(errorText)
          } catch {
            // If not JSON, use the text as is
          }
          
          console.error('🎬 DEBUG - OpenAI API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText,
            errorJson: errorJson
          })
          
          // Check for content policy violations
          const errorMessage = errorJson.error?.message || errorText || 'Unknown error'
          if (errorMessage.toLowerCase().includes('content policy') || 
              errorMessage.toLowerCase().includes('safety') ||
              errorMessage.toLowerCase().includes('content_filter') ||
              errorMessage.toLowerCase().includes('violates our usage policy') ||
              errorMessage.toLowerCase().includes('not allowed') ||
              errorMessage.toLowerCase().includes('sensitive content') ||
              errorJson.error?.code === 'content_filter' ||
              response.status === 400) {
            throw new Error('This content may contain copyrighted material or explicit content that cannot be generated. Please try a different description or modify your treatment content.')
          }
          
          throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`)
        }

        const result = await response.json()
        return { success: true, data: result }
      }
    } catch (error) {
      console.error('🎬 DEBUG - OpenAI API error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export class AnthropicService {
  static async generateText(params: AIGenerationParams): Promise<string> {
    const { prompt, selectedText, fullContent, apiKey, contentType, lockedSections } = params

    // Build context-aware prompt
    let systemPrompt = `You are a professional ${contentType} writer. Generate high-quality content based on the user's request.`
    
    if (lockedSections && lockedSections.length > 0) {
      systemPrompt += `\n\nIMPORTANT: The following sections are locked and must NOT be modified:\n`
      lockedSections.forEach(section => {
        systemPrompt += `- "${section.text}"\n`
      })
      systemPrompt += `\nWork around these locked sections and maintain the overall flow and context.`
    }

    let userPrompt = prompt
    if (selectedText) {
      userPrompt += `\n\nSelected text to work with: "${selectedText}"`
    }
    if (fullContent) {
      userPrompt += `\n\nFull content context: "${fullContent}"`
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.content[0]?.text || ''
  }
}

export class ElevenLabsService {
  static async generateSpeech(params: SpeechParams): Promise<SpeechResponse> {
    const { text, voiceId, apiKey } = params

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`ElevenLabs API error: ${error.detail?.message || 'Unknown error'}`)
    }

    const audioData = await response.arrayBuffer()
    
    // Create a blob URL for the audio
    const blob = new Blob([audioData], { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(blob)

    return {
      audio_url: audioUrl,
      audio_data: audioData
    }
  }

  static async getAvailableVoices(apiKey: string): Promise<VoicesResponse> {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`ElevenLabs API error: ${error.detail?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return {
      voices: data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description
      }))
    }
  }
}



