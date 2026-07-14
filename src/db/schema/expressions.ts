import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sessions } from "./sessions";
import { users } from "./users";

export const learningStatusEnum = pgEnum("learning_status", [
  "new",
  "practicing",
  "active",
  "mastered",
  "archived",
]);

export const priorityEnum = pgEnum("priority", ["high", "medium", "low"]);

export const usageStatusEnum = pgEnum("usage_status", ["used", "not_used", "unknown"]);

export const expressions = pgTable(
  "expressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    meaningJa: text("meaning_ja").notNull().default(""),
    expressionEn: text("expression_en").notNull(),
    normalizedExpressionEn: text("normalized_expression_en").notNull(),
    alternativeExpressions: jsonb("alternative_expressions")
      .$type<string[]>()
      .notNull()
      .default([]),
    examples: jsonb("examples").$type<string[]>().notNull().default([]),
    relatedWords: jsonb("related_words").$type<string[]>().notNull().default([]),
    usageNotes: text("usage_notes").notNull().default(""),
    pronunciationNotes: text("pronunciation_notes").notNull().default(""),
    learningStatus: learningStatusEnum("learning_status").notNull().default("new"),
    priority: priorityEnum("priority").notNull().default("medium"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("expressions_user_normalized_unique").on(
      table.userId,
      table.normalizedExpressionEn,
    ),
    index("expressions_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const sessionExpressions = pgTable(
  "session_expressions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    expressionId: uuid("expression_id")
      .notNull()
      .references(() => expressions.id, { onDelete: "restrict" }),
    expressionEnSnapshot: text("expression_en_snapshot").notNull(),
    meaningJaSnapshot: text("meaning_ja_snapshot").notNull().default(""),
    plannedToUse: boolean("planned_to_use").notNull().default(true),
    usageStatus: usageStatusEnum("usage_status").notNull().default("unknown"),
    usageEvaluation: text("usage_evaluation").notNull().default(""),
    feedback: text("feedback").notNull().default(""),
    carryOverToNext: boolean("carry_over_to_next").notNull().default(false),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("session_expressions_session_expression_unique").on(
      table.sessionId,
      table.expressionId,
    ),
    uniqueIndex("session_expressions_session_sequence_unique").on(table.sessionId, table.sequence),
    check("session_expressions_sequence_check", sql`${table.sequence} >= 0`),
  ],
);
