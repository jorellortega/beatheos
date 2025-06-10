import { supabase } from './supabaseClient'

export async function generateUniqueSlug(title: string): Promise<string> {
  // Convert title to lowercase and remove special characters
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  let slug = `1${baseSlug}`

  // Check if the slug already exists
  let { data: existing, error } = await supabase
    .from('beats')
    .select('slug')
    .eq('slug', slug)
    .single()

  if (!existing) {
    return slug
  }

  // If it exists, append a random string for uniqueness
  const randomStr = Math.random().toString(36).substring(2, 8)
  slug = `1${baseSlug}-${randomStr}`

  // Double-check for collision (extremely rare)
  let { data: existing2 } = await supabase
    .from('beats')
    .select('slug')
    .eq('slug', slug)
    .single()
  if (!existing2) {
    return slug
  }

  // If still exists, append timestamp
  slug = `1${baseSlug}-${randomStr}-${Date.now()}`
  return slug
} 