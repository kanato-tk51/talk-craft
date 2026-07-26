import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { aiProviders } from "./providers";
import { users } from "./users";

const conversationTypes = ["voice", "text", "mixed", "unknown"] as const;

const difficulties = ["beginner", "intermediate", "advanced", "unspecified"] as const;

const sessionStatuses = [
  "draft",
  "ready",
  "in_progress",
  "awaiting_review",
  "completed",
  "archived",
] as const;

const transcriptCompletenessValues = [
  "complete",
  "partial",
  "summary_only",
  "manual",
  "unknown",
] as const;

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aiProviderId: text("ai_provider_id").references(() => aiProviders.id, {
      onDelete: "set null",
    }),
    providerNameSnapshot: text("provider_name_snapshot").notNull().default(""),
    providerWebsiteUrlSnapshot: text("provider_website_url_snapshot"),
    modelName: text("model_name").notNull().default(""),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    objective: text("objective").notNull(),
    situation: text("situation").notNull().default(""),
    userRole: text("user_role").notNull().default(""),
    aiRole: text("ai_role").notNull().default(""),
    conversationType: text("conversation_type", { enum: conversationTypes })
      .notNull()
      .default("unknown"),
    difficulty: text("difficulty", { enum: difficulties }).notNull().default("unspecified"),
    plannedDurationMinutes: integer("planned_duration_minutes"),
    actualDurationMinutes: integer("actual_duration_minutes"),
    scheduledAt: integer("scheduled_at", { mode: "timestamp_ms" }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
    status: text("status", { enum: sessionStatuses }).notNull().default("draft"),
    transcriptCompleteness: text("transcript_completeness", {
      enum: transcriptCompletenessValues,
    })
      .notNull()
      .default("unknown"),
    preparationNotes: text("preparation_notes").notNull().default(""),
    reflectionNotes: text("reflection_notes").notNull().default(""),
    externalConversationUrl: text("external_conversation_url"),
    version: integer("version").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_user_scheduled_at_idx").on(table.userId, table.scheduledAt),
    index("sessions_user_status_idx").on(table.userId, table.status),
    check(
      "sessions_conversation_type_check",
      sql`${table.conversationType} in ('voice', 'text', 'mixed', 'unknown')`,
    ),
    check(
      "sessions_difficulty_check",
      sql`${table.difficulty} in ('beginner', 'intermediate', 'advanced', 'unspecified')`,
    ),
    check(
      "sessions_status_check",
      sql`${table.status} in ('draft', 'ready', 'in_progress', 'awaiting_review', 'completed', 'archived')`,
    ),
    check(
      "sessions_transcript_completeness_check",
      sql`${table.transcriptCompleteness} in ('complete', 'partial', 'summary_only', 'manual', 'unknown')`,
    ),
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
