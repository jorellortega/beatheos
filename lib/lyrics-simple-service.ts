import { supabase } from './supabaseClient'

export interface SimpleLyricsSession {
  id: string
  user_id: string
  name: string
  last_modified: string
  beat_ids?: string
  lyrics?: string
  verse_lyrics?: string[]
  hook_lyrics?: string
  others_lyrics?: string
  collaborators?: string
  status?: string
  pending_invite?: string
  lyrics_title?: string
  lyrics_content_type?: 'script' | 'lyrics' | 'poetry' | 'prose'
  lyrics_version?: number
  lyrics_version_name?: string
  lyrics_is_latest_version?: boolean
  lyrics_parent_id?: string
  lyrics_genre?: string
  lyrics_mood?: string
  lyrics_language?: string
  lyrics_tags?: string[]
  lyrics_description?: string
  lyrics_locked_sections?: any
  lyrics_ai_prompt?: string
  lyrics_ai_model?: string
  lyrics_ai_generation_settings?: any
  lyrics_ai_metadata?: any
  lyrics_arrangement?: any[]
}

export interface CreateLyricsData {
  name: string
  lyrics?: string
  lyrics_title?: string
  lyrics_content_type?: 'script' | 'lyrics' | 'poetry' | 'prose'
  lyrics_genre?: string
  lyrics_mood?: string
  lyrics_language?: string
  lyrics_tags?: string[]
  lyrics_description?: string
}

export interface UpdateLyricsData {
  name?: string
  lyrics?: string
  lyrics_title?: string
  lyrics_content_type?: 'script' | 'lyrics' | 'poetry' | 'prose'
  lyrics_genre?: string
  lyrics_mood?: string
  lyrics_language?: string
  lyrics_tags?: string[]
  lyrics_description?: string
  lyrics_locked_sections?: any
  lyrics_ai_prompt?: string
  lyrics_ai_model?: string
  lyrics_ai_generation_settings?: any
  lyrics_ai_metadata?: any
  status?: string
  lyrics_arrangement?: any[]
}

export class SimpleLyricsService {
  static async createLyricsSession(data: CreateLyricsData, userId: string): Promise<SimpleLyricsSession> {
    const { data: session, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        name: data.name,
        lyrics: data.lyrics || '',
        lyrics_title: data.lyrics_title || data.name,
        lyrics_content_type: data.lyrics_content_type || 'lyrics',
        lyrics_version: 1,
        lyrics_is_latest_version: true,
        lyrics_genre: data.lyrics_genre,
        lyrics_mood: data.lyrics_mood,
        lyrics_language: data.lyrics_language || 'English',
        lyrics_tags: data.lyrics_tags || [],
        lyrics_description: data.lyrics_description,
        lyrics_ai_generation_settings: {},
        lyrics_ai_metadata: {}
      })
      .select()
      .single()

    if (error) throw error
    return this.transformSession(session)
  }

  static async getUserLyricsSessions(userId: string, contentType?: string): Promise<SimpleLyricsSession[]> {
    let query = supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('lyrics_is_latest_version', true)
      .not('lyrics', 'is', null)
      .order('last_modified', { ascending: false })

    if (contentType) {
      query = query.eq('lyrics_content_type', contentType)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(this.transformSession)
  }

  static async getLyricsSessionById(sessionId: string): Promise<SimpleLyricsSession | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return this.transformSession(data)
  }

  static async updateLyricsSession(sessionId: string, userId: string, updates: UpdateLyricsData): Promise<SimpleLyricsSession> {
    const updateData: any = {
      last_modified: new Date().toISOString()
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.lyrics !== undefined) updateData.lyrics = updates.lyrics
    if (updates.lyrics_title !== undefined) updateData.lyrics_title = updates.lyrics_title
    if (updates.lyrics_content_type !== undefined) updateData.lyrics_content_type = updates.lyrics_content_type
    if (updates.lyrics_genre !== undefined) updateData.lyrics_genre = updates.lyrics_genre
    if (updates.lyrics_mood !== undefined) updateData.lyrics_mood = updates.lyrics_mood
    if (updates.lyrics_language !== undefined) updateData.lyrics_language = updates.lyrics_language
    if (updates.lyrics_tags !== undefined) updateData.lyrics_tags = updates.lyrics_tags
    if (updates.lyrics_description !== undefined) updateData.lyrics_description = updates.lyrics_description
    if (updates.lyrics_locked_sections !== undefined) updateData.lyrics_locked_sections = updates.lyrics_locked_sections
    if (updates.lyrics_ai_prompt !== undefined) updateData.lyrics_ai_prompt = updates.lyrics_ai_prompt
    if (updates.lyrics_ai_model !== undefined) updateData.lyrics_ai_model = updates.lyrics_ai_model
    if (updates.lyrics_ai_generation_settings !== undefined) updateData.lyrics_ai_generation_settings = updates.lyrics_ai_generation_settings
    if (updates.lyrics_ai_metadata !== undefined) updateData.lyrics_ai_metadata = updates.lyrics_ai_metadata
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.lyrics_arrangement !== undefined) updateData.lyrics_arrangement = updates.lyrics_arrangement

    const { data, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return this.transformSession(data)
  }

  static async deleteLyricsSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) throw error
  }

  static async searchLyricsSessions(userId: string, query: string): Promise<SimpleLyricsSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('lyrics_is_latest_version', true)
      .not('lyrics', 'is', null)
      .or(`name.ilike.%${query}%,lyrics.ilike.%${query}%,lyrics_title.ilike.%${query}%,lyrics_description.ilike.%${query}%`)
      .order('last_modified', { ascending: false })

    if (error) throw error
    return data.map(this.transformSession)
  }

  static async createVersion(sessionId: string, userId: string, versionData: Partial<CreateLyricsData>): Promise<SimpleLyricsSession> {
    // Get the original session
    const original = await this.getLyricsSessionById(sessionId)
    if (!original || original.user_id !== userId) {
      throw new Error('Session not found or access denied')
    }

    // Mark current version as not latest
    await supabase
      .from('sessions')
      .update({ lyrics_is_latest_version: false })
      .eq('id', sessionId)

    // Create new version
    const newVersion = (original.lyrics_version || 1) + 1
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: userId,
        name: versionData.name || original.name,
        lyrics: versionData.lyrics || original.lyrics,
        lyrics_title: versionData.lyrics_title || original.lyrics_title,
        lyrics_content_type: versionData.lyrics_content_type || original.lyrics_content_type,
        lyrics_version: newVersion,
        lyrics_version_name: versionData.lyrics_title || `Version ${newVersion}`,
        lyrics_is_latest_version: true,
        lyrics_parent_id: original.lyrics_parent_id || original.id,
        lyrics_genre: versionData.lyrics_genre || original.lyrics_genre,
        lyrics_mood: versionData.lyrics_mood || original.lyrics_mood,
        lyrics_language: versionData.lyrics_language || original.lyrics_language,
        lyrics_tags: versionData.lyrics_tags || original.lyrics_tags,
        lyrics_description: versionData.lyrics_description || original.lyrics_description,
        lyrics_ai_generation_settings: original.lyrics_ai_generation_settings,
        lyrics_ai_metadata: original.lyrics_ai_metadata
      })
      .select()
      .single()

    if (error) throw error
    return this.transformSession(data)
  }

  static async getVersions(sessionId: string, userId: string): Promise<SimpleLyricsSession[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${sessionId},lyrics_parent_id.eq.${sessionId}`)
      .order('lyrics_version', { ascending: false })

    if (error) throw error
    return data.map(this.transformSession)
  }

  private static transformSession(data: any): SimpleLyricsSession {
    return {
      ...data,
      lyrics_tags: data.lyrics_tags || [],
      lyrics_locked_sections: data.lyrics_locked_sections || null,
      lyrics_ai_generation_settings: data.lyrics_ai_generation_settings || {},
      lyrics_ai_metadata: data.lyrics_ai_metadata || {}
    }
  }
}
