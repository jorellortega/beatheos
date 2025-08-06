import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      name,
      description,
      audio_file_name,
      audio_file_hash,
      audio_file_url,
      bpm,
      grid_division,
      playback_rate,
      volume,
      zoom,
      vertical_zoom,
      waveform_offset,
      scroll_offset,
      display_width,
      snap_to_grid,
      show_grid,
      show_waveform,
      show_detailed_grid,
      marked_bars,
      marked_sub_bars,
      playhead_position,
      current_playback_time,
      is_playing,
      selection_start,
      selection_end,
      wave_selection_start,
      wave_selection_end,
      markers,
      regions,
      duplicate_wave,
      is_duplicate_main,
      play_both_mode,
      effects_settings,
      processing_chain,
      midi_settings,
      midi_mapping,
      tracks,
      track_sequence,
      edit_history,
      history_index,
      max_history,
      project_data,
      auto_save_enabled,
      last_auto_save,
      is_draft,
      version,
      parent_session_id
    } = body
    
    // Validate user_id is provided
    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Session name is required' }, { status: 400 })
    }

    // Insert session into database
    const { data: session, error: insertError } = await supabase
      .from('loop_editor_sessions')
      .insert({
        user_id,
        name,
        description,
        audio_file_name,
        audio_file_hash,
        audio_file_url,
        bpm,
        grid_division,
        playback_rate,
        volume,
        zoom,
        vertical_zoom,
        waveform_offset,
        scroll_offset,
        display_width,
        snap_to_grid,
        show_grid,
        show_waveform,
        show_detailed_grid,
        marked_bars,
        marked_sub_bars,
        playhead_position,
        current_playback_time,
        is_playing,
        selection_start,
        selection_end,
        wave_selection_start,
        wave_selection_end,
        markers,
        regions,
        duplicate_wave,
        is_duplicate_main,
        play_both_mode,
        effects_settings,
        processing_chain,
        midi_settings,
        midi_mapping,
        tracks,
        track_sequence,
        edit_history,
        history_index,
        max_history,
        project_data,
        auto_save_enabled,
        last_auto_save,
        is_draft,
        version,
        parent_session_id
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error saving session:', insertError)
      return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      session,
      message: 'Session saved successfully' 
    })

  } catch (error) {
    console.error('Error in save session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 