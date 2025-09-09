import { mysqlTable, varchar, timestamp, text, int, decimal, boolean } from "drizzle-orm/mysql-core"

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const profiles = mysqlTable("profiles", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  bio: text("bio"),
  avatar_url: varchar("avatar_url", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const licenses = mysqlTable("licenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  terms: text("terms"),
  is_exclusive: boolean("is_exclusive").default(false),
  is_buyout: boolean("is_buyout").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const beats = mysqlTable("beats", {
  id: varchar("id", { length: 255 }).primaryKey(),
  producer_id: varchar("producer_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  genre: varchar("genre", { length: 100 }),
  bpm: int("bpm"),
  key: varchar("key", { length: 10 }),
  price: decimal("price", { precision: 10, scale: 2 }),
  cover_image_url: varchar("cover_image_url", { length: 255 }),
  audio_url: varchar("audio_url", { length: 255 }).notNull(),
  wav_url: varchar("wav_url", { length: 255 }),
  stems_url: varchar("stems_url", { length: 255 }),
  is_draft: boolean("is_draft").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const beat_licenses = mysqlTable("beat_licenses", {
  id: varchar("id", { length: 255 }).primaryKey(),
  beat_id: varchar("beat_id", { length: 255 })
    .notNull()
    .references(() => beats.id),
  license_id: varchar("license_id", { length: 255 })
    .notNull()
    .references(() => licenses.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const playlists = mysqlTable("playlists", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  cover_image_url: varchar("cover_image_url", { length: 255 }),
  is_public: boolean("is_public").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const playlist_beats = mysqlTable("playlist_beats", {
  id: varchar("id", { length: 255 }).primaryKey(),
  playlist_id: varchar("playlist_id", { length: 255 })
    .notNull()
    .references(() => playlists.id),
  beat_id: varchar("beat_id", { length: 255 })
    .notNull()
    .references(() => beats.id),
  position: int("position").notNull(),
  added_at: timestamp("added_at").defaultNow(),
})

// Track Arrangements for saving individual track pattern arrangements
export const track_arrangements = mysqlTable("track_arrangements", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
  session_id: varchar("session_id", { length: 255 }), // Optional: link to a session
  track_id: int("track_id").notNull(), // The track ID from the beat maker
  track_name: varchar("track_name", { length: 255 }).notNull(), // Track name for display
  
  // Arrangement metadata
  name: varchar("name", { length: 255 }).notNull(), // User-defined name for this arrangement
  description: text("description"),
  version: varchar("version", { length: 50 }).default("1.0"),
  
  // Pattern arrangement data
  pattern_blocks: text("pattern_blocks").notNull(), // JSON string of PatternBlock objects
  total_bars: int("total_bars").notNull().default(64),
  zoom_level: int("zoom_level").default(50),
  
  // Arrangement settings
  bpm: int("bpm").notNull(),
  steps: int("steps").notNull().default(16),
  
  // Tags and categorization
  tags: text("tags"), // JSON array of tags
  category: varchar("category", { length: 100 }), // e.g., 'intro', 'verse', 'chorus', 'bridge', 'drop', 'breakdown'
  genre: varchar("genre", { length: 100 }), // e.g., 'Hip Hop', 'Trap', 'R&B'
  subgenre: varchar("subgenre", { length: 100 }), // e.g., 'Boom Bap', 'Drill', 'Neo Soul'
  audio_type: varchar("audio_type", { length: 100 }), // e.g., 'Melody Loop', 'Drum Loop', 'Kick', 'Snare'
  is_favorite: boolean("is_favorite").default(false),
  is_template: boolean("is_template").default(false), // Mark as template for reuse
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  last_used_at: timestamp("last_used_at"),
})

// Arrangement versions for version control
export const arrangement_versions = mysqlTable("arrangement_versions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  arrangement_id: varchar("arrangement_id", { length: 255 }).notNull(),
  version_number: int("version_number").notNull(),
  name: varchar("name", { length: 255 }),
  description: text("description"),
  pattern_blocks: text("pattern_blocks").notNull(), // JSON string of PatternBlock objects
  total_bars: int("total_bars").notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

// Arrangement tags for better tag management
export const arrangement_tags = mysqlTable("arrangement_tags", {
  id: varchar("id", { length: 255 }).primaryKey(),
  arrangement_id: varchar("arrangement_id", { length: 255 }).notNull(),
  tag_name: varchar("tag_name", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
})

// Tracks table for completed beats that can be moved to singles or albums
export const tracks = mysqlTable("tracks", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  description: text("description"),
  audio_url: varchar("audio_url", { length: 255 }),
  cover_art_url: varchar("cover_art_url", { length: 255 }),
  duration: varchar("duration", { length: 50 }),
  bpm: int("bpm"),
  key: varchar("key", { length: 10 }),
  genre: varchar("genre", { length: 100 }),
  subgenre: varchar("subgenre", { length: 100 }),
  
  // Session information (if exported from beat maker)
  session_id: varchar("session_id", { length: 255 }),
  session_name: varchar("session_name", { length: 255 }),
  
  // Status and production phase (same as singles)
  status: varchar("status", { length: 50 }).default("draft"),
  production_status: varchar("production_status", { length: 50 }).default("production"),
  
  // Metadata
  tags: text("tags"), // JSON array of tags
  notes: text("notes"),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  release_date: varchar("release_date", { length: 10 }), // DATE as string
})

// Lyrics AI Tables
export const lyrics_assets = mysqlTable("lyrics_assets", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content_type: varchar("content_type", { length: 50 }).notNull(), // 'script', 'lyrics', 'poetry', 'prose'
  content: text("content"),
  content_url: varchar("content_url", { length: 500 }),
  version: int("version").default(1),
  version_name: varchar("version_name", { length: 255 }),
  is_latest_version: boolean("is_latest_version").default(true),
  parent_asset_id: varchar("parent_asset_id", { length: 255 }),
  prompt: text("prompt"),
  model: varchar("model", { length: 100 }),
  generation_settings: text("generation_settings"), // JSON
  metadata: text("metadata"), // JSON
  locked_sections: text("locked_sections"), // JSON for text locking
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

export const lyrics = mysqlTable("lyrics", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  movie_id: varchar("movie_id", { length: 255 }),
  scene_id: varchar("scene_id", { length: 255 }),
  version: int("version").default(1),
  version_name: varchar("version_name", { length: 255 }),
  is_latest_version: boolean("is_latest_version").default(true),
  parent_lyrics_id: varchar("parent_lyrics_id", { length: 255 }),
  genre: varchar("genre", { length: 100 }),
  mood: varchar("mood", { length: 100 }),
  language: varchar("language", { length: 50 }).default("English"),
  tags: text("tags"), // JSON array
  description: text("description"),
  locked_sections: text("locked_sections"), // JSON for text locking
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

// User API Keys for AI Services
export const user_api_keys = mysqlTable("user_api_keys", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: varchar("user_id", { length: 255 }).notNull(),
  openai_api_key: text("openai_api_key"),
  anthropic_api_key: text("anthropic_api_key"),
  elevenlabs_api_key: text("elevenlabs_api_key"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
})

