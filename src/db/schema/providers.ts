import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { users } from "./users";

const providerTypes = ["preset", "custom", "api", "unknown"] as const;

export const aiProviders = sqliteTable(
  "ai_providers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    providerType: text("provider_type", { enum: providerTypes }).notNull().default("custom"),
    websiteUrl: text("website_url"),
    supportsVoice: integer("supports_voice", { mode: "boolean" }),
    supportsText: integer("supports_text", { mode: "boolean" }),
    supportsFileExport: integer("supports_file_export", { mode: "boolean" }),
    promptTemplateType: text("prompt_template_type"),
    notes: text("notes").notNull().default(""),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    index("ai_providers_user_id_idx").on(table.userId),
    check(
      "ai_providers_provider_type_check",
      sql`${table.providerType} in ('preset', 'custom', 'api', 'unknown')`,
    ),
  ],
);
