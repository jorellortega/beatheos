export interface LyricsAsset {
  id: string
  user_id: string
  title: string
  content_type: 'script' | 'lyrics' | 'poetry' | 'prose'
  content?: string
  content_url?: string
  version: number
  version_name?: string
  is_latest_version: boolean
  parent_asset_id?: string
  prompt?: string
  model?: string
  generation_settings?: Record<string, any>
  metadata?: Record<string, any>
  locked_sections?: LockedSection[]
  created_at: Date
  updated_at: Date
}

export interface Lyrics {
  id: string
  user_id: string
  title: string
  content: string
  movie_id?: string
  scene_id?: string
  version: number
  version_name?: string
  is_latest_version: boolean
  parent_lyrics_id?: string
  genre?: string
  mood?: string
  language: string
  tags?: string[]
  description?: string
  locked_sections?: LockedSection[]
  created_at: Date
  updated_at: Date
}

export interface LockedSection {
  id: string
  start: number
  end: number
  text: string
  locked_at: Date
}

export interface InlineEditingState {
  assetId: string
  field: 'title' | 'content' | 'version_name'
  value: string
}

export interface CreateAssetData {
  title: string
  content_type: 'script' | 'lyrics' | 'poetry' | 'prose'
  content?: string
  prompt?: string
  model?: string
  generation_settings?: Record<string, any>
  metadata?: Record<string, any>
}

export interface CreateLyricsData {
  title: string
  content: string
  movie_id?: string
  scene_id?: string
  genre?: string
  mood?: string
  language?: string
  tags?: string[]
  description?: string
}

export interface UpdateLyricsData {
  title?: string
  content?: string
  genre?: string
  mood?: string
  language?: string
  tags?: string[]
  description?: string
  locked_sections?: LockedSection[]
}

export interface UserApiKeys {
  id: string
  user_id: string
  openai_api_key?: string
  anthropic_api_key?: string
  elevenlabs_api_key?: string
  created_at: Date
  updated_at: Date
}

export interface AIGenerationParams {
  prompt: string
  selectedText?: string
  fullContent: string
  service: 'openai' | 'anthropic'
  apiKey: string
  contentType: string
  lockedSections?: LockedSection[]
}

export interface SpeechParams {
  text: string
  voiceId: string
  apiKey: string
}

export interface Voice {
  voice_id: string
  name: string
  category: string
  description?: string
}

export interface VoicesResponse {
  voices: Voice[]
}

export interface SpeechResponse {
  audio_url: string
  audio_data?: ArrayBuffer
}




