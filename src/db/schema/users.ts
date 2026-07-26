import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  englishLevel: text("english_level"),
  nativeLanguage: text("native_language").notNull().default("ja"),
  targetLanguage: text("target_language").notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
});
