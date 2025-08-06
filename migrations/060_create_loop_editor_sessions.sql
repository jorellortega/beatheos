-- Create loop_editor_sessions table
CREATE TABLE IF NOT EXISTS loop_editor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    description TEXT,
    audio_file_name VARCHAR,
    audio_file_hash VARCHAR,
    bpm INTEGER,
    grid_division INTEGER,
    playback_rate NUMERIC,
    volume NUMERIC,
    zoom NUMERIC,
    vertical_zoom NUMERIC,
    waveform_offset NUMERIC,
    scroll_offset NUMERIC,
    display_width INTEGER,
    snap_to_grid BOOLEAN,
    show_grid BOOLEAN,
    show_waveform BOOLEAN,
    show_detailed_grid BOOLEAN,
    marked_bars INTEGER[],
    marked_sub_bars INTEGER[],
    playhead_position NUMERIC,
    current_playback_time NUMERIC,
    is_playing BOOLEAN,
    selection_start NUMERIC,
    selection_end NUMERIC,
    wave_selection_start NUMERIC,
    wave_selection_end NUMERIC,
    markers JSONB,
    regions JSONB,
    duplicate_wave JSONB,
    is_duplicate_main BOOLEAN,
    play_both_mode BOOLEAN,
    effects_settings JSONB,
    processing_chain JSONB,
    midi_settings JSONB,
    midi_mapping JSONB,
    tracks JSONB,
    track_sequence INTEGER[],
    edit_history JSONB,
    history_index INTEGER,
    max_history INTEGER,
    project_data JSONB,
    auto_save_enabled BOOLEAN,
    last_auto_save TIMESTAMPTZ,
    is_draft BOOLEAN,
    version VARCHAR,
    parent_session_id UUID REFERENCES loop_editor_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_loop_editor_sessions_user_id ON loop_editor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_loop_editor_sessions_audio_file_name ON loop_editor_sessions(audio_file_name);
CREATE INDEX IF NOT EXISTS idx_loop_editor_sessions_created_at ON loop_editor_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_loop_editor_sessions_updated_at ON loop_editor_sessions(updated_at);

-- Add comments to describe the table and its purpose
COMMENT ON TABLE loop_editor_sessions IS 'Stores loop editor sessions with all state data for audio editing';
COMMENT ON COLUMN loop_editor_sessions.user_id IS 'User who owns this session';
COMMENT ON COLUMN loop_editor_sessions.audio_file_name IS 'Original audio file name for session matching';
COMMENT ON COLUMN loop_editor_sessions.audio_file_hash IS 'Hash of audio file for integrity checking';
COMMENT ON COLUMN loop_editor_sessions.bpm IS 'Beats per minute for the session';
COMMENT ON COLUMN loop_editor_sessions.grid_division IS 'Grid division (e.g., 4 for quarter notes)';
COMMENT ON COLUMN loop_editor_sessions.zoom IS 'Horizontal zoom level';
COMMENT ON COLUMN loop_editor_sessions.vertical_zoom IS 'Vertical zoom level';
COMMENT ON COLUMN loop_editor_sessions.waveform_offset IS 'Horizontal offset for waveform dragging';
COMMENT ON COLUMN loop_editor_sessions.markers IS 'JSON array of marker objects with time, name, category, color, positions';
COMMENT ON COLUMN loop_editor_sessions.regions IS 'JSON array of region objects with startTime, endTime, name, color, isSelected';
COMMENT ON COLUMN loop_editor_sessions.duplicate_wave IS 'JSON object containing duplicate wave data and settings';
COMMENT ON COLUMN loop_editor_sessions.effects_settings IS 'JSON object containing pitch, halftime, and other effects settings';
COMMENT ON COLUMN loop_editor_sessions.midi_settings IS 'JSON object containing MIDI export and conversion settings';
COMMENT ON COLUMN loop_editor_sessions.tracks IS 'JSON array of track objects for multi-track support';
COMMENT ON COLUMN loop_editor_sessions.edit_history IS 'JSON array of edit history for undo/redo functionality';
COMMENT ON COLUMN loop_editor_sessions.parent_session_id IS 'Reference to parent session for versioning support'; 