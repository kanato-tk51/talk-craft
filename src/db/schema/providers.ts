import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const providerTypeEnum = pgEnum("provider_type", ["preset", "custom", "api", "unknown"]);

export const aiProviders = pgTable(
  "ai_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    providerType: providerTypeEnum("provider_type").notNull().default("custom"),
    websiteUrl: text("website_url"),
    supportsVoice: boolean("supports_voice"),
    supportsText: boolean("supports_text"),
    supportsFileExport: boolean("supports_file_export"),
    promptTemplateType: varchar("prompt_template_type", { length: 100 }),
    notes: text("notes").notNull().default(""),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_providers_user_id_idx").on(table.userId)],
);
