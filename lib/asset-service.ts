import { supabase } from './supabaseClient'
import { LyricsAsset, CreateAssetData } from '@/types/lyrics'

export class AssetService {
  static async createAsset(assetData: CreateAssetData, userId: string): Promise<LyricsAsset> {
    const { data: asset, error } = await supabase
      .from('lyrics_assets')
      .insert({
        user_id: userId,
        title: assetData.title,
        content_type: assetData.content_type,
        content: assetData.content,
        prompt: assetData.prompt,
        model: assetData.model,
        generation_settings: assetData.generation_settings ? JSON.stringify(assetData.generation_settings) : null,
        metadata: assetData.metadata ? JSON.stringify(assetData.metadata) : null,
        version: 1,
        is_latest_version: true
      })
      .select()
      .single()

    if (error) throw error
    return this.transformAsset(asset)
  }

  static async getAssetsForUser(userId: string, contentType?: string): Promise<LyricsAsset[]> {
    let query = supabase
      .from('lyrics_assets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_latest_version', true)
      .order('updated_at', { ascending: false })

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    const { data, error } = await query

    if (error) throw error
    return data.map(this.transformAsset)
  }

  static async getAssetById(assetId: string): Promise<LyricsAsset | null> {
    const { data, error } = await supabase
      .from('lyrics_assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return this.transformAsset(data)
  }

  static async updateAsset(assetId: string, userId: string, updates: Partial<CreateAssetData>): Promise<LyricsAsset> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.prompt !== undefined) updateData.prompt = updates.prompt
    if (updates.model !== undefined) updateData.model = updates.model
    if (updates.generation_settings !== undefined) updateData.generation_settings = JSON.stringify(updates.generation_settings)
    if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata)

    const { data, error } = await supabase
      .from('lyrics_assets')
      .update(updateData)
      .eq('id', assetId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return this.transformAsset(data)
  }

  static async deleteAsset(assetId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('lyrics_assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', userId)

    if (error) throw error
  }

  static async createVersion(assetId: string, userId: string, versionData: Partial<CreateAssetData>): Promise<LyricsAsset> {
    // Get the original asset
    const original = await this.getAssetById(assetId)
    if (!original || original.user_id !== userId) {
      throw new Error('Asset not found or access denied')
    }

    // Mark current version as not latest
    await supabase
      .from('lyrics_assets')
      .update({ is_latest_version: false })
      .eq('id', assetId)

    // Create new version
    const newVersion = original.version + 1
    const { data, error } = await supabase
      .from('lyrics_assets')
      .insert({
        user_id: userId,
        title: versionData.title || original.title,
        content_type: versionData.content_type || original.content_type,
        content: versionData.content || original.content,
        prompt: versionData.prompt || original.prompt,
        model: versionData.model || original.model,
        generation_settings: versionData.generation_settings ? JSON.stringify(versionData.generation_settings) : original.generation_settings,
        metadata: versionData.metadata ? JSON.stringify(versionData.metadata) : original.metadata,
        version: newVersion,
        version_name: versionData.title || `Version ${newVersion}`,
        is_latest_version: true,
        parent_asset_id: original.parent_asset_id || original.id
      })
      .select()
      .single()

    if (error) throw error
    return this.transformAsset(data)
  }

  static async getVersions(assetId: string, userId: string): Promise<LyricsAsset[]> {
    const { data, error } = await supabase
      .from('lyrics_assets')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${assetId},parent_asset_id.eq.${assetId}`)
      .order('version', { ascending: false })

    if (error) throw error
    return data.map(this.transformAsset)
  }

  private static transformAsset(data: any): LyricsAsset {
    return {
      ...data,
      generation_settings: data.generation_settings ? JSON.parse(data.generation_settings) : undefined,
      metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
      locked_sections: data.locked_sections ? JSON.parse(data.locked_sections) : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    }
  }
}

