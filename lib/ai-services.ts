import { AIGenerationParams, SpeechParams, VoicesResponse, SpeechResponse } from '@/types/lyrics'
import {
  DEFAULT_GPT_IMAGE_MODEL,
  resolveGptImageApiModel,
  resolveOpenAIImageMainlineModel,
  resolveOpenAIModel,
  isGptImageModelId,
  buildOpenAITokenLimit,
  buildOpenAITemperature,
} from '@/lib/openai-models'
import { coverSizeToApiSize } from '@/lib/cover-art-helpers'

export interface GenerateImageRequest {
  prompt: string
  style?: string
  model: string
  apiKey: string
  size?: string
  referenceImageUrl?: string
  referenceImages?: Blob[]
  referenceImageUrls?: string[]
}

export interface EditImageRequest {
  prompt: string
  referenceImageUrl: string
  style?: string
  model: string
  apiKey: string
  size?: string
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

async function resolveReferenceImageBlobs(request: GenerateImageRequest): Promise<Blob[]> {
  const blobs: Blob[] = [...(request.referenceImages ?? [])]

  for (const imageUrl of request.referenceImageUrls ?? []) {
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to load reference image')
    }
    blobs.push(await imageResponse.blob())
  }

  if (request.referenceImageUrl) {
    const imageResponse = await fetch(request.referenceImageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to load reference image')
    }
    blobs.push(await imageResponse.blob())
  }

  return blobs
}

function extensionForBlob(blob: Blob): string {
  const type = blob.type.toLowerCase()
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('webp')) return 'webp'
  if (type.includes('png')) return 'png'
  return 'png'
}

export class OpenAIService {
  static async generateText(params: AIGenerationParams): Promise<string> {
    const { prompt, selectedText, fullContent, apiKey, contentType, lockedSections, model } = params

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

    const resolvedModel = resolveOpenAIModel(model)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        ...buildOpenAITokenLimit(resolvedModel, 2000),
        ...buildOpenAITemperature(resolvedModel, 0.7),
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

  private static async generateImageWithReferences(
    request: GenerateImageRequest,
    referenceBlobs: Blob[]
  ): Promise<AIResponse> {
    const useImagesApi = isGptImageModelId(request.model)
    const stylePrefix = request.style ? `${request.style}: ` : ''
    const fullPrompt = `${stylePrefix}${request.prompt}`

    if (useImagesApi) {
      const imageModel = resolveGptImageApiModel(request.model)
      const formData = new FormData()
      formData.append('model', imageModel)
      formData.append('prompt', fullPrompt)
      formData.append('size', coverSizeToApiSize(request.size))
      formData.append('quality', 'medium')

      referenceBlobs.forEach((blob, index) => {
        const ext = extensionForBlob(blob)
        formData.append('image[]', blob, `reference-${index + 1}.${ext}`)
      })

      const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorJson: { error?: { message?: string } } = {}
        try {
          errorJson = errorText ? JSON.parse(errorText) : {}
        } catch {
          errorJson = { error: { message: errorText } }
        }
        throw new Error(errorJson.error?.message || `API Error (${response.status})`)
      }

      const result = await response.json()
      return { success: true, data: result }
    }

    const mainlineModel = resolveOpenAIImageMainlineModel(request.model)
    const content: Array<{ type: string; text?: string; image_url?: string }> = []

    for (const blob of referenceBlobs) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read reference image'))
        reader.readAsDataURL(blob)
      })
      content.push({ type: 'input_image', image_url: dataUrl })
    }

    content.push({
      type: 'input_text',
      text: `Create a new album cover image using the attached reference image(s). ${fullPrompt}`,
    })

    const requestBody: Record<string, unknown> = {
      model: mainlineModel,
      input: [{ role: 'user', content }],
      tools: [{ type: 'image_generation' }],
      tool_choice: { type: 'image_generation' },
    }
    if (mainlineModel.startsWith('gpt-5')) {
      requestBody.reasoning = { effort: 'none' }
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorJson: { error?: { message?: string } } = {}
      try {
        errorJson = errorText ? JSON.parse(errorText) : {}
      } catch {
        errorJson = { error: { message: errorText } }
      }
      throw new Error(errorJson.error?.message || `API Error (${response.status})`)
    }

    const data = await response.json()
    const imageGenerationCall = data.output?.find(
      (output: { type?: string }) => output.type === 'image_generation_call'
    )
    const imageData = imageGenerationCall?.result

    if (!imageData) {
      throw new Error('No image in response - model returned text instead of generating image.')
    }

    return {
      success: true,
      data: {
        data: [{ url: `data:image/png;base64,${imageData}`, b64_json: imageData }],
      },
    }
  }

  static async generateImage(request: GenerateImageRequest): Promise<AIResponse> {
    try {
      console.log('🎬 DEBUG - OpenAI API request:', {
        promptLength: request.prompt.length,
        promptPreview: request.prompt.substring(0, 200) + '...',
        style: request.style,
        model: request.model
      })

      const referenceBlobs = await resolveReferenceImageBlobs(request)
      if (referenceBlobs.length > 0) {
        return await this.generateImageWithReferences(request, referenceBlobs)
      }

      // GPT Image models use the Images API; GPT-5+ uses Responses API with image_generation tool
      const useImagesApi = isGptImageModelId(request.model)
      const useResponsesApi = !useImagesApi && request.model.startsWith('gpt-')

      if (useImagesApi) {
        const imageModel = resolveGptImageApiModel(request.model)
        console.log('🖼️ IMAGE GENERATION - Using Images API')
        console.log('🖼️ IMAGE GENERATION - Model:', imageModel)

        const imageSize = coverSizeToApiSize(request.size)
        console.log('🖼️ IMAGE GENERATION - Output Size:', imageSize)

        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${request.apiKey}`,
          },
          body: JSON.stringify({
            prompt: `${request.style} style: ${request.prompt}`,
            n: 1,
            size: imageSize,
            model: imageModel,
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
          const errorMessage = errorJson.error?.message || errorText || 'Unknown error'
          throw new Error(`API Error (${response.status}): ${errorMessage}`)
        }

        const result = await response.json()
        return { success: true, data: result }
      }

      if (useResponsesApi) {
        const mainlineModel = resolveOpenAIImageMainlineModel(request.model)
        console.log('🖼️ IMAGE GENERATION - Using GPT Image (Responses API)')
        console.log('🖼️ IMAGE GENERATION - Model:', mainlineModel)
        console.log('🖼️ IMAGE GENERATION - Prompt:', request.prompt)
        console.log('🖼️ IMAGE GENERATION - API Endpoint: /v1/responses')
        console.log('🖼️ IMAGE GENERATION - Output Size:', coverSizeToApiSize(request.size), '(Responses API)')
        
        const requestBody: any = {
          model: mainlineModel,
          input: `Create a visual image. ${request.style} style: ${request.prompt}. Generate the image now.`,
          tools: [{ type: "image_generation" }],
          tool_choice: { type: "image_generation" },
        }
        if (mainlineModel.startsWith('gpt-5')) {
          requestBody.reasoning = { effort: 'none' }
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

  static async editImage(request: EditImageRequest): Promise<AIResponse> {
    try {
      const stylePrefix = request.style ? `${request.style}: ` : ''
      const fullPrompt = `${stylePrefix}${request.prompt}`
      const useImagesApi = isGptImageModelId(request.model)

      if (useImagesApi) {
        const imageModel = resolveGptImageApiModel(request.model)
        const imageResponse = await fetch(request.referenceImageUrl)
        if (!imageResponse.ok) {
          throw new Error('Failed to load reference cover image')
        }
        const imageBlob = await imageResponse.blob()

        const formData = new FormData()
        formData.append('model', imageModel)
        formData.append('image[]', imageBlob, 'reference.png')
        formData.append('prompt', fullPrompt)
        formData.append('size', coverSizeToApiSize(request.size))
        formData.append('quality', 'medium')

        const response = await fetch('https://api.openai.com/v1/images/edits', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${request.apiKey}`,
          },
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorJson: { error?: { message?: string } } = {}
          try {
            errorJson = errorText ? JSON.parse(errorText) : {}
          } catch {
            errorJson = { error: { message: errorText } }
          }
          throw new Error(errorJson.error?.message || `API Error (${response.status})`)
        }

        const result = await response.json()
        return { success: true, data: result }
      }

      const mainlineModel = resolveOpenAIImageMainlineModel(request.model)
      const requestBody: Record<string, unknown> = {
        model: mainlineModel,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_image', image_url: request.referenceImageUrl },
              {
                type: 'input_text',
                text: `Edit the attached album cover image. ${fullPrompt} Keep the same overall style and composition as the reference unless the edit says otherwise.`,
              },
            ],
          },
        ],
        tools: [{ type: 'image_generation' }],
        tool_choice: { type: 'image_generation' },
      }
      if (mainlineModel.startsWith('gpt-5')) {
        requestBody.reasoning = { effort: 'none' }
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorJson: { error?: { message?: string } } = {}
        try {
          errorJson = errorText ? JSON.parse(errorText) : {}
        } catch {
          errorJson = { error: { message: errorText } }
        }
        throw new Error(errorJson.error?.message || `API Error (${response.status})`)
      }

      const data = await response.json()
      let imageData: string | null = null
      const imageGenerationCall = data.output?.find(
        (output: { type?: string }) => output.type === 'image_generation_call'
      )
      if (imageGenerationCall?.result) {
        imageData = imageGenerationCall.result
      }

      if (!imageData) {
        throw new Error('No edited image returned from the AI service')
      }

      return {
        success: true,
        data: {
          data: [{ url: `data:image/png;base64,${imageData}`, b64_json: imageData }],
        },
      }
    } catch (error) {
      console.error('OpenAI edit image error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

function formatElevenLabsErrorMessage(detail: unknown): string {
  if (!detail) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'msg' in item) return String(item.msg)
        if (item && typeof item === 'object' && 'message' in item) return String(item.message)
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message?: string }).message)
  }
  return JSON.stringify(detail)
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

  static async composeMusic(params: {
    prompt: string
    apiKey: string
    musicLengthMs?: number
    modelId?: 'music_v1' | 'music_v2'
    forceInstrumental?: boolean
    outputFormat?: string
  }): Promise<ArrayBuffer> {
    const {
      prompt,
      apiKey,
      musicLengthMs = 120000,
      modelId = 'music_v2',
      forceInstrumental = true,
      outputFormat = 'mp3_48000_192',
    } = params

    const response = await fetch(
      `https://api.elevenlabs.io/v1/music?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          music_length_ms: musicLengthMs,
          model_id: modelId,
          force_instrumental: forceInstrumental,
        }),
      }
    )

    if (!response.ok) {
      let errorMessage = 'ElevenLabs music generation failed'
      let rawError: unknown = null
      try {
        const error = await response.json()
        rawError = error
        errorMessage = formatElevenLabsErrorMessage(error.detail) || error.message || errorMessage
      } catch {
        // response body may not be JSON
      }

      console.error('[elevenlabs-composeMusic] failed:', {
        status: response.status,
        statusText: response.statusText,
        outputFormat,
        errorMessage,
        rawError,
        keyPreview:
          apiKey.length >= 8
            ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)} (len=${apiKey.length})`
            : `(len=${apiKey.length})`,
      })

      const err = new Error(errorMessage) as Error & {
        httpStatus?: number
        elevenLabsRaw?: unknown
        outputFormat?: string
      }
      err.httpStatus = response.status
      err.elevenLabsRaw = rawError
      err.outputFormat = outputFormat
      throw err
    }

    return response.arrayBuffer()
  }
}



