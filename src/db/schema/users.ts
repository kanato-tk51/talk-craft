import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  englishLevel: varchar("english_level", { length: 40 }),
  nativeLanguage: varchar("native_language", { length: 20 }).notNull().default("ja"),
  targetLanguage: varchar("target_language", { length: 20 }).notNull().default("en"),
  timezone: text("timezone").notNull().default("Asia/Tokyo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
