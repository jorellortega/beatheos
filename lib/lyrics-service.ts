import { supabase } from './supabaseClient'
import { Lyrics, CreateLyricsData, UpdateLyricsData } from '@/types/lyrics'

export class LyricsService {
  static async createLyrics(data: CreateLyricsData, userId: string): Promise<Lyrics> {
    const { data: lyrics, error } = await supabase
      .from('lyrics')
      .insert({
        user_id: userId,
        title: data.title,
        content: data.content,
        movie_id: data.movie_id,
        scene_id: data.scene_id,
        genre: data.genre,
        mood: data.mood,
        language: data.language || 'English',
        tags: data.tags ? JSON.stringify(data.tags) : null,
        description: data.description,
        version: 1,
        is_latest_version: true
      })
      .select()
      .single()

    if (error) throw error
    return this.transformLyrics(lyrics)
  }

  static async getUserLyrics(userId: string): Promise<Lyrics[]> {
    const { data, error } = await supabase
      .from('lyrics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_latest_version', true)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data.map(this.transformLyrics)
  }

  static async getLyricsById(lyricsId: string): Promise<Lyrics | null> {
    const { data, error } = await supabase
      .from('lyrics')
      .select('*')
      .eq('id', lyricsId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return this.transformLyrics(data)
  }

  static async updateLyrics(lyricsId: string, userId: string, updates: UpdateLyricsData): Promise<Lyrics> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.genre !== undefined) updateData.genre = updates.genre
    if (updates.mood !== undefined) updateData.mood = updates.mood
    if (updates.language !== undefined) updateData.language = updates.language
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags)
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.locked_sections !== undefined) updateData.locked_sections = JSON.stringify(updates.locked_sections)

    const { data, error } = await supabase
      .from('lyrics')
      .update(updateData)
      .eq('id', lyricsId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return this.transformLyrics(data)
  }

  static async deleteLyrics(lyricsId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lyrics')
      .delete()
      .eq('id', lyricsId)
      .eq('user_id', userId)

    if (error) throw error
  }

  static async searchLyrics(userId: string, query: string): Promise<Lyrics[]> {
    const { data, error } = await supabase
      .from('lyrics')
      .select('*')
      .eq('user_id', userId)
      .eq('is_latest_version', true)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data.map(this.transformLyrics)
  }

  static async createVersion(lyricsId: string, userId: string, versionData: Partial<CreateLyricsData>): Promise<Lyrics> {
    // Get the original lyrics
    const original = await this.getLyricsById(lyricsId)
    if (!original || original.user_id !== userId) {
      throw new Error('Lyrics not found or access denied')
    }

    // Mark current version as not latest
    await supabase
      .from('lyrics')
      .update({ is_latest_version: false })
      .eq('id', lyricsId)

    // Create new version
    const newVersion = original.version + 1
    const { data, error } = await supabase
      .from('lyrics')
      .insert({
        user_id: userId,
        title: versionData.title || original.title,
        content: versionData.content || original.content,
        movie_id: versionData.movie_id || original.movie_id,
        scene_id: versionData.scene_id || original.scene_id,
        genre: versionData.genre || original.genre,
        mood: versionData.mood || original.mood,
        language: versionData.language || original.language,
        tags: versionData.tags ? JSON.stringify(versionData.tags) : original.tags,
        description: versionData.description || original.description,
        version: newVersion,
        version_name: versionData.title || `Version ${newVersion}`,
        is_latest_version: true,
        parent_lyrics_id: original.parent_lyrics_id || original.id
      })
      .select()
      .single()

    if (error) throw error
    return this.transformLyrics(data)
  }

  static async getVersions(lyricsId: string, userId: string): Promise<Lyrics[]> {
    const { data, error } = await supabase
      .from('lyrics')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${lyricsId},parent_lyrics_id.eq.${lyricsId}`)
      .order('version', { ascending: false })

    if (error) throw error
    return data.map(this.transformLyrics)
  }

  private static transformLyrics(data: any): Lyrics {
    return {
      ...data,
      tags: data.tags ? JSON.parse(data.tags) : undefined,
      locked_sections: data.locked_sections ? JSON.parse(data.locked_sections) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    }
  }
}

