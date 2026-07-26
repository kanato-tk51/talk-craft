import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sessions } from "./sessions";
import { users } from "./users";

const learningStatuses = ["new", "practicing", "active", "mastered", "archived"] as const;

const priorities = ["high", "medium", "low"] as const;

const usageStatuses = ["used", "not_used", "unknown"] as const;

export const expressions = sqliteTable(
  "expressions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    meaningJa: text("meaning_ja").notNull().default(""),
    expressionEn: text("expression_en").notNull(),
    normalizedExpressionEn: text("normalized_expression_en").notNull(),
    alternativeExpressions: text("alternative_expressions", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    examples: text("examples", { mode: "json" }).$type<string[]>().notNull().default([]),
    relatedWords: text("related_words", { mode: "json" }).$type<string[]>().notNull().default([]),
    usageNotes: text("usage_notes").notNull().default(""),
    pronunciationNotes: text("pronunciation_notes").notNull().default(""),
    learningStatus: text("learning_status", { enum: learningStatuses }).notNull().default("new"),
    priority: text("priority", { enum: priorities }).notNull().default("medium"),
    lastReviewedAt: integer("last_reviewed_at", { mode: "timestamp_ms" }),
    nextReviewAt: integer("next_review_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("expressions_user_normalized_unique").on(
      table.userId,
      table.normalizedExpressionEn,
    ),
    index("expressions_user_updated_at_idx").on(table.userId, table.updatedAt),
    check(
      "expressions_learning_status_check",
      sql`${table.learningStatus} in ('new', 'practicing', 'active', 'mastered', 'archived')`,
    ),
    check("expressions_priority_check", sql`${table.priority} in ('high', 'medium', 'low')`),
  ],
);

export const sessionExpressions = sqliteTable(
  "session_expressions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    expressionId: text("expression_id")
      .notNull()
      .references(() => expressions.id, { onDelete: "restrict" }),
    expressionEnSnapshot: text("expression_en_snapshot").notNull(),
    meaningJaSnapshot: text("meaning_ja_snapshot").notNull().default(""),
    plannedToUse: integer("planned_to_use", { mode: "boolean" }).notNull().default(true),
    usageStatus: text("usage_status", { enum: usageStatuses }).notNull().default("unknown"),
    usageEvaluation: text("usage_evaluation").notNull().default(""),
    feedback: text("feedback").notNull().default(""),
    carryOverToNext: integer("carry_over_to_next", { mode: "boolean" }).notNull().default(false),
    sequence: integer("sequence").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("session_expressions_session_expression_unique").on(
      table.sessionId,
      table.expressionId,
    ),
    uniqueIndex("session_expressions_session_sequence_unique").on(table.sessionId, table.sequence),
    check("session_expressions_sequence_check", sql`${table.sequence} >= 0`),
    check(
      "session_expressions_usage_status_check",
      sql`${table.usageStatus} in ('used', 'not_used', 'unknown')`,
    ),
  ],
);
