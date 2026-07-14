import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { aiProviders } from "./providers";
import { users } from "./users";

export const conversationTypeEnum = pgEnum("conversation_type", [
  "voice",
  "text",
  "mixed",
  "unknown",
]);

export const difficultyEnum = pgEnum("difficulty", [
  "beginner",
  "intermediate",
  "advanced",
  "unspecified",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "draft",
  "ready",
  "in_progress",
  "awaiting_review",
  "completed",
  "archived",
]);

export const transcriptCompletenessEnum = pgEnum("transcript_completeness", [
  "complete",
  "partial",
  "summary_only",
  "manual",
  "unknown",
]);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aiProviderId: uuid("ai_provider_id").references(() => aiProviders.id, {
      onDelete: "set null",
    }),
    providerNameSnapshot: varchar("provider_name_snapshot", { length: 200 }).notNull().default(""),
    providerWebsiteUrlSnapshot: text("provider_website_url_snapshot"),
    modelName: varchar("model_name", { length: 200 }).notNull().default(""),
    title: varchar("title", { length: 120 }).notNull(),
    topic: varchar("topic", { length: 500 }).notNull(),
    objective: text("objective").notNull(),
    situation: text("situation").notNull().default(""),
    userRole: varchar("user_role", { length: 500 }).notNull().default(""),
    aiRole: varchar("ai_role", { length: 500 }).notNull().default(""),
    conversationType: conversationTypeEnum("conversation_type").notNull().default("unknown"),
    difficulty: difficultyEnum("difficulty").notNull().default("unspecified"),
    plannedDurationMinutes: integer("planned_duration_minutes"),
    actualDurationMinutes: integer("actual_duration_minutes"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: sessionStatusEnum("status").notNull().default("draft"),
    transcriptCompleteness: transcriptCompletenessEnum("transcript_completeness")
      .notNull()
      .default("unknown"),
    preparationNotes: text("preparation_notes").notNull().default(""),
    reflectionNotes: text("reflection_notes").notNull().default(""),
    externalConversationUrl: text("external_conversation_url"),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_scheduled_at_idx").on(table.userId, table.scheduledAt),
    index("sessions_user_status_idx").on(table.userId, table.status),
    check(
      "sessions_planned_duration_check",
      sql`${table.plannedDurationMinutes} is null or ${table.plannedDurationMinutes} between 1 and 240`,
    ),
    check(
      "sessions_actual_duration_check",
      sql`${table.actualDurationMinutes} is null or ${table.actualDurationMinutes} between 1 and 1440`,
    ),
    check("sessions_version_check", sql`${table.version} >= 1`),
  ],
);
