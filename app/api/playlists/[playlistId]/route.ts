import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET(req: Request, { params }: { params: { playlistId: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });
    
    // Get the playlist and its beats
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select(`
        *,
        playlist_beats (
          beat_id,
          position
        ),
        user_id
      `)
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlist) return new NextResponse("Playlist not found", { status: 404 });

    // Get beats in order
    const beatIds = (playlist.playlist_beats || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((pb: any) => pb.beat_id);

    let beats = [];
    if (beatIds.length > 0) {
      const { data: beatsData, error: beatsError } = await supabase
        .from("beats")
        .select(`
          id,
          title,
          mp3_url,
          cover_art_url,
          slug,
          producer_id,
          genre,
          bpm,
          key,
          price,
          play_count,
          average_rating,
          total_ratings,
          producers:producer_id (
            display_name
          )
        `)
        .in("id", beatIds);

      if (beatsError) throw beatsError;

      // Preserve playlist order and add producer_display_name
      beats = beatIds.map((id: string) => {
        const b = beatsData.find((b: any) => b.id === id);
        if (!b) return null;
        return {
          ...b,
          producer_display_name: Array.isArray(b.producers) ? (b.producers[0]?.display_name || '') : (b.producers?.display_name || ''),
        };
      }).filter(Boolean);
    }

    return NextResponse.json({ ...playlist, beats });
  } catch (error) {
    console.error("[PLAYLIST_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { playlistId: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlist) {
      return new NextResponse("Playlist not found", { status: 404 });
    }

    // Delete all beats from playlist first
    const { error: deleteBeatsError } = await supabase
      .from("playlist_beats")
      .delete()
      .eq("playlist_id", params.playlistId);

    if (deleteBeatsError) throw deleteBeatsError;

    // Delete the playlist
    const { error: deletePlaylistError } = await supabase
      .from("playlists")
      .delete()
      .eq("id", params.playlistId)
      .eq("user_id", user.id);

    if (deletePlaylistError) throw deletePlaylistError;

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PLAYLIST_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { playlistId: string } }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Check if playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (playlistError) throw playlistError;
    if (!playlist) {
      return new NextResponse("Playlist not found", { status: 404 });
    }

    // Update the playlist
    const { data: updatedPlaylist, error: updateError } = await supabase
      .from("playlists")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.playlistId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json(updatedPlaylist);
  } catch (error) {
    console.error("[PLAYLIST_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 