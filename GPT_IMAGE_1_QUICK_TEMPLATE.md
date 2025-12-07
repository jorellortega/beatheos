# GPT Image 1 Quick Implementation Template

Quick copy-paste template for implementing GPT Image 1 with CORS handling in a new project.

---

## Core Service (lib/ai-services.ts)

```typescript
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
  static async generateImage(request: GenerateImageRequest): Promise<AIResponse> {
    try {
      // Check if this is a GPT image model (gpt-image-1 or GPT-5 models)
      const isGPTImageModel = request.model === 'gpt-image-1' || request.model.startsWith('gpt-')
      
      if (isGPTImageModel) {
        // GPT Image 1 - Use Responses API
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
        }
        
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

        const data = await response.json()
        
        // Extract image from response - check multiple possible locations
        let imageData = null
        
        // Check for image_generation_call in output
        const imageGenerationCall = data.output?.find((output: any) => output.type === "image_generation_call")
        if (imageGenerationCall) {
          imageData = imageGenerationCall.result
        } else {
          // Check message output for tool calls
          const messageOutput = data.output?.find((output: any) => output.type === "message")
          if (messageOutput?.content) {
            for (const contentItem of messageOutput.content) {
              if (contentItem.type === "tool_call" && contentItem.tool_call?.type === "image_generation") {
                imageData = contentItem.tool_call.result
                break
              }
            }
          }
          
          // Also check tool_calls at message level
          if (!imageData && messageOutput?.tool_calls) {
            const imageToolCall = messageOutput.tool_calls.find((tc: any) => tc.type === "image_generation")
            if (imageToolCall) {
              imageData = imageToolCall.result
            }
          }
        }
        
        if (imageData) {
          // Return in compatible format (base64)
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
          throw new Error('No image in response - model returned text instead of generating image.')
        }
      } else {
        // DALL-E - Use Images API (returns URL, requires server-side download due to CORS)
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
          const errorMessage = errorJson.error?.message || errorText || 'Unknown error'
          throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`)
        }

        const result = await response.json()
        return { success: true, data: result }
      }
    } catch (error) {
      console.error('OpenAI API error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}
```

---

## Client-Side Usage (Handles Both Types)

```typescript
// Normalize model name
const normalizeImageModel = (modelValue: string) => {
  if (modelValue === 'gpt-image-1' || modelValue?.startsWith('gpt-')) {
    return modelValue;
  }
  if (modelValue?.toLowerCase().includes('dall')) {
    return 'dall-e-3';
  }
  return modelValue || 'gpt-image-1'; // Default to gpt-image-1
};

// Generate image
const response = await OpenAIService.generateImage({
  prompt: 'Your prompt here',
  style: 'cinematic, professional',
  model: normalizeImageModel(selectedModel), // Use 'gpt-image-1' to avoid CORS
  apiKey: apiKey,
});

if (!response.success || !response.data) {
  throw new Error(response.error || 'Failed to generate image');
}

const imageData = response.data.data?.[0];
const imageUrl = imageData?.url || (imageData?.b64_json ? `data:image/png;base64,${imageData.b64_json}` : '');

// Handle based on response type
if (imageUrl.startsWith('data:')) {
  // GPT Image 1 - Base64 (client-side upload, no CORS issues)
  const base64Data = imageUrl.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Upload directly to storage (client-side)
  const { error: uploadError } = await supabase.storage
    .from('your-bucket')
    .upload(filePath, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });
    
  if (uploadError) throw new Error('Failed to upload image');
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('your-bucket')
    .getPublicUrl(filePath);
    
} else {
  // DALL-E - URL (requires server-side download due to CORS)
  const downloadResponse = await fetch('/api/ai/download-and-store-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      imageUrl: imageUrl,
      fileName: 'generated_image',
      userId: user.id
    })
  });

  const downloadResult = await downloadResponse.json();
  if (!downloadResult.success) {
    throw new Error(downloadResult.error || 'Failed to download and store image');
  }
  
  // Use downloadResult.supabaseUrl
}
```

---

## Server-Side Download API Route (For DALL-E)

**File:** `app/api/ai/download-and-store-image/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, fileName, userId } = body

    if (!imageUrl || !fileName || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, fileName, userId' },
        { status: 400 }
      )
    }

    // Download image from URL (server-side, no CORS issues)
    const imageResponse = await fetch(imageUrl)
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`)
    }

    const arrayBuffer = await imageResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determine file path
    const filePath = `user_uploads/${userId}/${Date.now()}_${fileName}.png`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('your-bucket')
      .upload(filePath, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('your-bucket')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      supabaseUrl: publicUrl,
      filePath
    })
  } catch (error: any) {
    console.error('Error downloading and storing image:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to download and store image' 
      },
      { status: 500 }
    )
  }
}
```

---

## Supabase Bucket CORS Configuration

**File:** `fix_cors_settings.sql`

```sql
-- Fix CORS settings for your storage bucket
-- Run this in your Supabase SQL editor

UPDATE storage.buckets 
SET cors_origins = ARRAY[
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5173',
  'https://your-production-domain.com'
]
WHERE id = 'your-bucket-name';

-- Verify the update
SELECT id, cors_origins FROM storage.buckets WHERE id = 'your-bucket-name';
```

---

## Key Points

1. **Use `gpt-image-1` as default** - Avoids CORS issues entirely
2. **GPT Image 1** = Base64 response = Client-side upload ✅
3. **DALL-E** = URL response = Server-side download required ⚠️
4. **Always normalize model names** before calling API
5. **Check response type** (`data:` URI vs URL) before processing

---

## Quick Checklist

- [ ] Copy `OpenAIService.generateImage()` method
- [ ] Copy client-side handling code (check for `data:` prefix)
- [ ] Create `/api/ai/download-and-store-image` route (for DALL-E fallback)
- [ ] Configure Supabase bucket CORS
- [ ] Test with `gpt-image-1` model first (should work without server route)
- [ ] Test with `dall-e-3` model (requires server route)

---

## Why This Works

✅ **GPT Image 1** returns base64 in API response → No CORS when uploading to your storage  
❌ **DALL-E** returns URL on OpenAI's CDN → CORS blocks client-side download → Use server-side download

**Recommendation:** Always default to `gpt-image-1` unless you specifically need DALL-E features.


