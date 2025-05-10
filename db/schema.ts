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

