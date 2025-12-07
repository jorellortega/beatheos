# GPT Image 1 Implementation Guide

## Summary: How We Made GPT Image 1 Work with CORS Handling

This document explains how we successfully implemented OpenAI's GPT Image 1 model for image generation, including how we solved the CORS (Cross-Origin Resource Sharing) issue encountered with DALL-E models.

---

## The Problem: CORS Issues with DALL-E

When using **DALL-E 3** (or earlier versions) for image generation, OpenAI returns a **URL** to the generated image. When trying to download this image directly from the browser (client-side), you encounter **CORS errors** because:

1. DALL-E images are hosted on OpenAI's CDN (`oaidalleapiprodscus.blob.core.windows.net`)
2. These servers don't allow cross-origin requests from your domain
3. Browser security blocks the fetch/download operation

**Error you'll see:**
```
Access to fetch at 'https://oaidalleapiprodscus.blob.core.windows.net/...' 
from origin 'https://yourdomain.com' has been blocked by CORS policy
```

---

## The Solution: Two-Path Approach

We implemented a **dual-path solution** that handles both GPT Image 1 and DALL-E models differently:

### Path 1: GPT Image 1 (No CORS Issues)
- Returns **base64-encoded image data** directly in the API response
- Can be handled **client-side** without CORS issues
- No additional download step needed

### Path 2: DALL-E (Server-Side Download)
- Returns an **image URL**
- Must be downloaded **server-side** via a Next.js API route
- Bypasses CORS since server-to-server requests don't have CORS restrictions

---

## Implementation Details

### 1. Model Detection & API Selection

**Key File:** `lib/ai-services.ts`

The system automatically detects which model you're using and routes to the appropriate API endpoint:

```typescript
// Check if this is a GPT image model (gpt-image-1 or GPT-5 models)
const isGPTImageModel = request.model === 'gpt-image-1' || request.model.startsWith('gpt-')

if (isGPTImageModel) {
  // Use Responses API for GPT Image models
  // Endpoint: /v1/responses
  // Returns base64 image data
} else {
  // Use Images API for DALL-E models
  // Endpoint: /v1/images/generations
  // Returns image URL
}
```

### 2. GPT Image 1 API Configuration

**API Endpoint:** `https://api.openai.com/v1/responses`

**Request Body:**
```typescript
{
  model: 'gpt-4.1-mini',  // gpt-image-1 maps to gpt-4.1-mini
  input: `Create a visual image. ${style} style: ${prompt}. Generate the image now.`,
  tools: [{ type: "image_generation" }],
  tool_choice: { type: "image_generation" }  // Force the tool to be called
}
```

**Important Notes:**
- When `model: 'gpt-image-1'` is specified, it's mapped to `gpt-4.1-mini` internally
- The `tool_choice` parameter **forces** the model to use the image generation tool
- The response structure is different from DALL-E's Images API

### 3. Response Parsing (GPT Image 1)

The GPT Image 1 response can have the image data in multiple locations. Our implementation checks all possible locations:

```typescript
// Check multiple response structures
1. data.output[].type === "image_generation_call" → result
2. data.output[].type === "message" → content[].tool_call.result
3. messageOutput.tool_calls[].type === "image_generation" → result
```

**Response Format:**
```typescript
{
  success: true,
  data: {
    data: [{
      url: `data:image/png;base64,${imageData}`,  // Data URI for direct use
      b64_json: imageData  // Raw base64 string
    }]
  }
}
```

### 4. Client-Side Image Handling (GPT Image 1)

**Key File:** `app/myalbums/[albumId]/page.tsx` (lines 1180-1210)

When the image comes as base64 (GPT Image 1):

```typescript
if (imageUrl.startsWith('data:')) {
  // Base64 data URI (GPT Image) - can be handled client-side
  const base64Data = imageUrl.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Upload directly to Supabase storage (client-side)
  const { error: uploadError } = await supabase.storage
    .from('beats')
    .upload(filePath, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });
}
```

### 5. Server-Side Image Download (DALL-E)

**Key File:** `app/api/ai/download-and-store-image/route.ts`

When the image comes as a URL (DALL-E), we use a server-side API route:

```typescript
// Client-side code calls this API route
const downloadResponse = await fetch('/api/ai/download-and-store-image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    imageUrl: imageUrl,  // DALL-E URL
    fileName: 'cover_art',
    userId: user.id,
    albumId: album.id
  })
});
```

**Server-side (Next.js API Route):**
```typescript
// Download image from URL (server-side, no CORS issues)
const imageResponse = await fetch(imageUrl)  // Server-to-server, no CORS!
const arrayBuffer = await imageResponse.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

// Upload to Supabase storage
await supabase.storage
  .from('beats')
  .upload(filePath, buffer, {
    contentType: 'image/png',
    cacheControl: '3600',
    upsert: false
  })
```

---

## Model Normalization

**Key File:** `app/myalbums/[albumId]/page.tsx` (lines 1132-1142)

We normalize model names to ensure consistency:

```typescript
const normalizeImageModel = (modelValue: string) => {
  // If already gpt-image-1 or GPT model, keep it
  if (modelValue === 'gpt-image-1' || modelValue?.startsWith('gpt-')) {
    return modelValue;
  }
  // If contains 'dall', use dall-e-3
  if (modelValue?.toLowerCase().includes('dall')) {
    return 'dall-e-3';
  }
  // Default to gpt-image-1 if not specified
  return modelValue || 'gpt-image-1';
};
```

**Default Model:** `gpt-image-1` (recommended - no CORS issues)

---

## CORS Configuration (Storage Bucket)

**Key File:** `fix_cors_settings.sql`

Even though GPT Image 1 avoids CORS for the download, you still need to configure CORS for your Supabase storage bucket to allow uploads:

```sql
-- Update CORS policy for the beats bucket
UPDATE storage.buckets 
SET cors_origins = ARRAY[
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5173',
  'https://your-production-domain.com'
]
WHERE id = 'beats';

-- Verify the update
SELECT id, cors_origins FROM storage.buckets WHERE id = 'beats';
```

**Note:** This is for your Supabase bucket, not OpenAI's CDN. OpenAI's CDN CORS settings cannot be changed, which is why we use the server-side download for DALL-E.

---

## Complete Implementation Flow

### GPT Image 1 Flow:
```
1. User clicks "Generate Image"
   ↓
2. Client calls OpenAIService.generateImage({ model: 'gpt-image-1', ... })
   ↓
3. Service detects GPT model → Uses /v1/responses endpoint
   ↓
4. OpenAI returns base64 image in response
   ↓
5. Client converts base64 → Blob → Uploads directly to Supabase
   ✅ No CORS issues!
```

### DALL-E Flow:
```
1. User clicks "Generate Image"
   ↓
2. Client calls OpenAIService.generateImage({ model: 'dall-e-3', ... })
   ↓
3. Service detects DALL-E model → Uses /v1/images/generations endpoint
   ↓
4. OpenAI returns image URL
   ↓
5. Client calls /api/ai/download-and-store-image (server-side)
   ↓
6. Server downloads image from OpenAI CDN (no CORS!)
   ↓
7. Server uploads to Supabase
   ↓
8. Client receives Supabase URL
   ✅ CORS bypassed via server!
```

---

## Key Differences: GPT Image 1 vs DALL-E

| Feature | GPT Image 1 | DALL-E 3 |
|---------|------------|----------|
| **API Endpoint** | `/v1/responses` | `/v1/images/generations` |
| **Response Type** | Base64 data | Image URL |
| **CORS Issues** | ❌ None | ✅ Yes (requires server-side download) |
| **Client-Side Upload** | ✅ Yes | ❌ No |
| **Model Name** | `gpt-image-1` → maps to `gpt-4.1-mini` | `dall-e-3` |
| **Request Structure** | Uses `tools` and `tool_choice` | Uses `prompt`, `n`, `size` |
| **Response Parsing** | Complex (multiple locations) | Simple (single URL) |

---

## Recommendations for New Implementations

1. **Default to GPT Image 1** (`gpt-image-1`)
   - Avoids CORS issues entirely
   - Simpler client-side implementation
   - No need for server-side download API route

2. **Always normalize model names** to handle variations

3. **Check response type** (data URI vs URL) before processing:
   ```typescript
   if (imageUrl.startsWith('data:')) {
     // GPT Image 1 - handle client-side
   } else {
     // DALL-E - use server-side download
   }
   ```

4. **Set up Supabase bucket CORS** for client-side uploads

5. **Handle errors gracefully** - both APIs can fail for different reasons

---

## Testing Checklist

- [ ] Test GPT Image 1 generation (should work client-side)
- [ ] Test DALL-E generation (should use server-side download)
- [ ] Verify images upload to Supabase storage
- [ ] Check CORS settings on Supabase bucket
- [ ] Test error handling for invalid API keys
- [ ] Test error handling for content policy violations (DALL-E)
- [ ] Verify model normalization works correctly

---

## Example Usage

```typescript
import { OpenAIService } from '@/lib/ai-services'

// Generate image with GPT Image 1 (recommended)
const response = await OpenAIService.generateImage({
  prompt: 'A futuristic cityscape at sunset',
  style: 'cinematic, professional',
  model: 'gpt-image-1',  // No CORS issues!
  apiKey: 'your-openai-api-key'
})

if (response.success && response.data) {
  const imageUrl = response.data.data[0].url  // data:image/png;base64,...
  // Use directly or convert to blob for upload
}
```

---

## Troubleshooting

### Issue: "No image in response"
- **Cause:** Model returned text instead of generating image
- **Solution:** Check `tool_choice` is set correctly, verify model supports image generation

### Issue: CORS error with DALL-E
- **Cause:** Trying to download DALL-E URL client-side
- **Solution:** Use server-side download API route (`/api/ai/download-and-store-image`)

### Issue: Image upload fails to Supabase
- **Cause:** CORS not configured on storage bucket
- **Solution:** Run `fix_cors_settings.sql` to update bucket CORS settings

### Issue: Model not recognized
- **Cause:** Model name not normalized
- **Solution:** Use `normalizeImageModel()` function before calling API

---

## Files Modified/Created

1. `lib/ai-services.ts` - Main service with dual-path logic
2. `app/api/ai/download-and-store-image/route.ts` - Server-side download for DALL-E
3. `app/myalbums/[albumId]/page.tsx` - Client-side handling for both types
4. `fix_cors_settings.sql` - Supabase bucket CORS configuration

---

## Summary

✅ **GPT Image 1** (`gpt-image-1`) = Base64 response = No CORS issues = Client-side upload  
✅ **DALL-E 3** = URL response = CORS issues = Server-side download required  
✅ **Best Practice:** Use GPT Image 1 by default to avoid CORS complications


