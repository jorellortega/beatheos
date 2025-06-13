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

export async function POST(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return new NextResponse("Unauthorized", { status: 401 })
    const body = await req.json()
    const { beatId } = body

    if (!beatId) {
      return new NextResponse("Beat ID is required", { status: 400 })
    }

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (playlistError) throw playlistError
    if (!playlist) {
      return new NextResponse("Playlist not found", { status: 404 })
    }

    // Get current position
    const { data: beats, error: beatsError } = await supabase
      .from("playlist_beats")
      .select("position")
      .eq("playlist_id", params.playlistId)
      .order("position", { ascending: false })
      .limit(1)
    if (beatsError) throw beatsError
    const position = beats && beats.length > 0 ? (beats[0].position + 1) : 0

    // Add beat to playlist
    const { data: playlistBeat, error: insertError } = await supabase
      .from("playlist_beats")
      .insert({
        playlist_id: params.playlistId,
        beat_id: beatId,
        position,
      })
      .select()
      .single()
    if (insertError) throw insertError
    return NextResponse.json(playlistBeat)
  } catch (error) {
    console.error("[PLAYLIST_BEATS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { playlistId: string } }
) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return new NextResponse("Unauthorized", { status: 401 })
    const { searchParams } = new URL(req.url)
    const beatId = searchParams.get("beatId")

    if (!beatId) {
      return new NextResponse("Beat ID is required", { status: 400 })
    }

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (playlistError) throw playlistError
    if (!playlist) {
      return new NextResponse("Playlist not found", { status: 404 })
    }

    // Remove beat from playlist
    const { error: deleteError } = await supabase
      .from("playlist_beats")
      .delete()
      .eq("playlist_id", params.playlistId)
      .eq("beat_id", beatId)
    if (deleteError) throw deleteError
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("[PLAYLIST_BEATS_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
} 