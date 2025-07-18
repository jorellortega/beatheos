-- Create beat_sessions table for saving individual user sessions
CREATE TABLE IF NOT EXISTS beat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Basic session settings
  bpm INTEGER NOT NULL DEFAULT 120,
  steps INTEGER NOT NULL DEFAULT 16,
  
  -- Track data (all tracks with their configurations)
  tracks JSONB NOT NULL, -- Store track configuration (name, color, audioUrl, type, etc.)
  sequencer_data JSONB NOT NULL, -- Store the step pattern data for all tracks
  
  -- Mixer data (volume, pan, effects per track)
  mixer_data JSONB NOT NULL DEFAULT '{}', -- Store mixer settings: {trackId: {volume, pan, mute, solo, effects}}
  
  -- Effects rack data (per track effects)
  effects_data JSONB NOT NULL DEFAULT '{}', -- Store effects: {trackId: {reverb, delay, distortion, etc.}}
  
  -- Piano roll data (if using piano roll)
  piano_roll_data JSONB, -- Store piano roll notes and patterns
  
  -- Sample library data
  sample_library_data JSONB, -- Store selected samples and sample configurations
  
  -- Transport and playback state
  playback_state JSONB DEFAULT '{}', -- Store current playback position, isPlaying, etc.
  
  -- UI state and preferences
  ui_state JSONB DEFAULT '{}', -- Store UI preferences, open panels, selected tracks, etc.
  
  -- Collaboration settings
  is_public BOOLEAN DEFAULT false, -- Allow other users to view/copy
  is_template BOOLEAN DEFAULT false, -- Mark as template for others to use
  allow_collaboration BOOLEAN DEFAULT false, -- Enable real-time collaboration
  
  -- Metadata
  tags TEXT[],
  category VARCHAR(100),
  genre VARCHAR(100),
  key VARCHAR(10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played_at TIMESTAMP WITH TIME ZONE,
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_collaborators table for multi-user collaboration
CREATE TABLE IF NOT EXISTS session_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
  permissions JSONB, -- Store specific permissions
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Create session_changes table for tracking collaborative changes
CREATE TABLE IF NOT EXISTS session_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL, -- 'track_add', 'track_delete', 'sequencer_update', 'bpm_change', etc.
  change_data JSONB NOT NULL, -- Store the actual change data
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER NOT NULL -- For conflict resolution
);

-- Create session_comments table for collaboration communication
CREATE TABLE IF NOT EXISTS session_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  parent_comment_id UUID REFERENCES session_comments(id) ON DELETE CASCADE -- For threaded comments
);

-- Create session_versions table for version control
CREATE TABLE IF NOT EXISTS session_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name VARCHAR(255),
  description TEXT,
  tracks JSONB NOT NULL,
  sequencer_data JSONB NOT NULL,
  bpm INTEGER NOT NULL,
  steps INTEGER NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, version_number)
);

-- Create session_invitations table for collaboration invites
CREATE TABLE IF NOT EXISTS session_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES beat_sessions(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'editor',
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX beat_sessions_user_id_idx ON beat_sessions(user_id);
CREATE INDEX beat_sessions_created_at_idx ON beat_sessions(created_at);
CREATE INDEX beat_sessions_is_public_idx ON beat_sessions(is_public);
CREATE INDEX beat_sessions_is_template_idx ON beat_sessions(is_template);
CREATE INDEX beat_sessions_category_idx ON beat_sessions(category);

CREATE INDEX session_collaborators_session_id_idx ON session_collaborators(session_id);
CREATE INDEX session_collaborators_user_id_idx ON session_collaborators(user_id);
CREATE INDEX session_collaborators_role_idx ON session_collaborators(role);

CREATE INDEX session_changes_session_id_idx ON session_changes(session_id);
CREATE INDEX session_changes_user_id_idx ON session_changes(user_id);
CREATE INDEX session_changes_timestamp_idx ON session_changes(timestamp);
CREATE INDEX session_changes_version_idx ON session_changes(version);

CREATE INDEX session_comments_session_id_idx ON session_comments(session_id);
CREATE INDEX session_comments_user_id_idx ON session_comments(user_id);
CREATE INDEX session_comments_timestamp_idx ON session_comments(timestamp);

CREATE INDEX session_versions_session_id_idx ON session_versions(session_id);
CREATE INDEX session_versions_version_number_idx ON session_versions(version_number);

CREATE INDEX session_invitations_session_id_idx ON session_invitations(session_id);
CREATE INDEX session_invitations_invited_email_idx ON session_invitations(invited_email);
CREATE INDEX session_invitations_expires_at_idx ON session_invitations(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE beat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for beat_sessions
CREATE POLICY "Users can view their own sessions" ON beat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public sessions" ON beat_sessions
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view sessions they collaborate on" ON beat_sessions
  FOR SELECT USING (
    id IN (
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own sessions" ON beat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON beat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can update sessions" ON beat_sessions
  FOR UPDATE USING (
    id IN (
      SELECT session_id FROM session_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Users can delete their own sessions" ON beat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for session_collaborators
CREATE POLICY "Users can view session collaborators" ON session_collaborators
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Session owners can manage collaborators" ON session_collaborators
  FOR ALL USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
    )
  );

-- Create policies for session_changes
CREATE POLICY "Users can view session changes" ON session_changes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can insert changes" ON session_changes
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Create policies for session_comments
CREATE POLICY "Users can view session comments" ON session_comments
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can insert comments" ON session_comments
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments" ON session_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for session_versions
CREATE POLICY "Users can view session versions" ON session_versions
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can create versions" ON session_versions
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
      UNION
      SELECT session_id FROM session_collaborators 
      WHERE user_id = auth.uid() AND role IN ('owner', 'editor')
    )
  );

-- Create policies for session_invitations
CREATE POLICY "Users can view their invitations" ON session_invitations
  FOR SELECT USING (
    invited_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Session owners can manage invitations" ON session_invitations
  FOR ALL USING (
    session_id IN (
      SELECT id FROM beat_sessions WHERE user_id = auth.uid()
    )
  );

-- Functions to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_beat_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_session_collaborators_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update timestamps
CREATE TRIGGER update_beat_sessions_updated_at
  BEFORE UPDATE ON beat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_beat_sessions_updated_at();

CREATE TRIGGER update_session_collaborators_last_active
  BEFORE UPDATE ON session_collaborators
  FOR EACH ROW EXECUTE FUNCTION update_session_collaborators_last_active();

-- Function to create a new session version
CREATE OR REPLACE FUNCTION create_session_version(
  p_session_id UUID,
  p_name VARCHAR(255),
  p_description TEXT,
  p_created_by UUID
)
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
  session_data RECORD;
BEGIN
  -- Get the next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM session_versions
  WHERE session_id = p_session_id;
  
  -- Get current session data
  SELECT * INTO session_data
  FROM beat_sessions
  WHERE id = p_session_id;
  
  -- Create new version
  INSERT INTO session_versions (
    session_id, version_number, name, description,
    tracks, sequencer_data, bpm, steps, created_by
  ) VALUES (
    p_session_id, next_version, p_name, p_description,
    session_data.tracks, session_data.sequencer_data,
    session_data.bpm, session_data.steps, p_created_by
  );
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql; 