import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { sessions } from "./sessions";

export const promptTypeEnum = pgEnum("prompt_type", ["conversation_start", "review_output"]);

export const generatedPrompts = pgTable(
  "generated_prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    promptType: promptTypeEnum("prompt_type").notNull(),
    templateKey: varchar("template_key", { length: 120 }).notNull(),
    templateVersion: varchar("template_version", { length: 40 }).notNull(),
    schemaVersion: varchar("schema_version", { length: 40 }),
    inputSnapshot: jsonb("input_snapshot").$type<Record<string, unknown>>().notNull(),
    renderedContent: text("rendered_content").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("generated_prompts_session_type_revision_unique").on(
      table.sessionId,
      table.promptType,
      table.revision,
    ),
    check("generated_prompts_revision_check", sql`${table.revision} >= 1`),
  ],
);
