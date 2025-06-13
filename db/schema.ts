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

