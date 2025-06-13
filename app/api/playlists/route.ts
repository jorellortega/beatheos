import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  if (!token) return null
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return new NextResponse("Unauthorized", { status: 401 })
    const { data, error } = await supabase
      .from("playlists")
      .select("*, playlist_beats (beat_id)")
      .eq("user_id", user.id)
    if (error) throw error
    const playlistsWithCount = (data || []).map((playlist: any) => ({
      ...playlist,
      beat_count: playlist.playlist_beats?.length || 0,
      beats: undefined,
    }))
    return NextResponse.json(playlistsWithCount)
  } catch (error) {
    console.error("[PLAYLISTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return new NextResponse("Unauthorized", { status: 401 })
    const body = await req.json()
    const { name, description, is_public } = body
    if (!name) {
      return new NextResponse("Name is required", { status: 400 })
    }
    const { data, error } = await supabase
      .from("playlists")
      .insert({
        user_id: user.id,
        name,
        description,
        is_public: is_public ?? false,
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error("[PLAYLISTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 