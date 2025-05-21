import { supabase } from './supabaseClient'

export async function generateUniqueSlug(title: string): Promise<string> {
  // Convert title to lowercase and remove special characters
  const baseSlug = title.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  // Check if any beat exists with this base slug
  const { data: existingBeats, error } = await supabase
    .from('beats')
    .select('slug')
    .ilike('slug', `${baseSlug}%`)
    .order('slug', { ascending: true })

  if (error) {
    throw new Error('Failed to check existing slugs')
  }

  if (!existingBeats || existingBeats.length === 0) {
    return `1${baseSlug}`
  }

  // Get all existing slugs that match our pattern
  const existingSlugs = existingBeats.map(beat => beat.slug)
  
  // Try numeric prefixes first (1-99)
  for (let i = 1; i <= 99; i++) {
    const slug = `${i}${baseSlug}`
    if (!existingSlugs.includes(slug)) {
      return slug
    }
  }

  // Try alphanumeric prefixes (a1-a99, b1-b99, etc.)
  for (let letter = 'a'.charCodeAt(0); letter <= 'z'.charCodeAt(0); letter++) {
    for (let i = 1; i <= 99; i++) {
      const slug = `${String.fromCharCode(letter)}${i}${baseSlug}`
      if (!existingSlugs.includes(slug)) {
        return slug
      }
    }
  }

  // If we've exhausted all possibilities, start with 1a1
  let counter = 1
  while (true) {
    const slug = `1a${counter}${baseSlug}`
    if (!existingSlugs.includes(slug)) {
      return slug
    }
    counter++
  }
} 