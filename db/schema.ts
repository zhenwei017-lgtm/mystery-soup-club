import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const customSoups = sqliteTable("custom_soups", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull().default("新作"),
  playTime: text("play_time").notNull().default("约 10 分钟"),
  surface: text("surface").notNull(),
  truth: text("truth").notNull(),
  hint: text("hint").notNull(),
  keyFacts: text("key_facts").notNull(),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
