import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { sessions } from "./sessions";

const promptTypes = ["conversation_start", "review_output"] as const;

export const generatedPrompts = sqliteTable(
  "generated_prompts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    promptType: text("prompt_type", { enum: promptTypes }).notNull(),
    templateKey: text("template_key").notNull(),
    templateVersion: text("template_version").notNull(),
    schemaVersion: text("schema_version"),
    inputSnapshot: text("input_snapshot", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    renderedContent: text("rendered_content").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("generated_prompts_session_type_revision_unique").on(
      table.sessionId,
      table.promptType,
      table.revision,
    ),
    check("generated_prompts_revision_check", sql`${table.revision} >= 1`),
    check(
      "generated_prompts_prompt_type_check",
      sql`${table.promptType} in ('conversation_start', 'review_output')`,
    ),
  ],
);
