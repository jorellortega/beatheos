import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  
  // Get our custom auth token from cookies
  const authCookie = cookieStore.get('beatheos-auth-token')
  let accessToken = null
  
  if (authCookie?.value) {
    try {
      const authData = JSON.parse(authCookie.value)
      accessToken = authData.access_token
    } catch (error) {
      console.error('Error parsing auth cookie:', error)
    }
  }
  
  // Create a Supabase client with the access token if available
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : {}
      }
    }
  )
  
  return supabase
} 