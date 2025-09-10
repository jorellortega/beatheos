import { AIGenerationParams, SpeechParams, VoicesResponse, SpeechResponse } from '@/types/lyrics'

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

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
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



