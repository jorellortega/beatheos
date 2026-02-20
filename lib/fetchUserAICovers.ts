import { supabase } from '@/lib/supabaseClient'

export interface UserAICover {
  id: string
  user_id: string
  cover_url: string
  cover_size: string | null
  prompt: string | null
  storage_path: string | null
  created_at: string
  updated_at: string
}

/**
 * Fetches all saved AI covers for a user
 * @param userId - The user ID to fetch covers for
 * @returns Array of saved AI covers
 */
export async function fetchUserAICovers(userId: string): Promise<UserAICover[]> {
  try {
    const { data, error } = await supabase
      .from('user_ai_covers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user AI covers:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to fetch user AI covers:', error)
    return []
  }
}

/**
 * Fetches a single AI cover by ID
 * @param coverId - The cover ID to fetch
 * @returns The AI cover or null if not found
 */
export async function fetchAICoverById(coverId: string): Promise<UserAICover | null> {
  try {
    const { data, error } = await supabase
      .from('user_ai_covers')
      .select('*')
      .eq('id', coverId)
      .single()

    if (error) {
      console.error('Error fetching AI cover:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Failed to fetch AI cover:', error)
    return null
  }
}

/**
 * Deletes a saved AI cover
 * @param coverId - The cover ID to delete
 * @returns Success status
 */
export async function deleteAICover(coverId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_ai_covers')
      .delete()
      .eq('id', coverId)

    if (error) {
      console.error('Error deleting AI cover:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to delete AI cover:', error)
    return false
  }
}

