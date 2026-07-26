import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import {
  type KeyExpression,
  TRANSLATION_PROMPT_VERSION,
  type TranscriptBlock,
  type TranslationBlock,
  type YoutubeCaptionSource,
} from "@/modules/youtube/domain/youtube-material";

import { users } from "./users";

export const youtubeMaterials = sqliteTable(
  "youtube_materials",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    youtubeVideoId: text("youtube_video_id").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    channelName: text("channel_name").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull(),
    captionLanguageCode: text("caption_language_code").notNull(),
    captionTrackName: text("caption_track_name").notNull().default(""),
    captionSource: text("caption_source")
      .$type<YoutubeCaptionSource>()
      .notNull()
      .default("creator"),
    transcriptText: text("transcript_text").notNull(),
    transcriptBlocks: text("transcript_blocks", { mode: "json" })
      .$type<TranscriptBlock[]>()
      .notNull(),
    translationPrompt: text("translation_prompt").notNull(),
    promptVersion: text("prompt_version").notNull().default(TRANSLATION_PROMPT_VERSION),
    summaryJa: text("summary_ja").notNull().default(""),
    translationBlocks: text("translation_blocks", { mode: "json" })
      .$type<TranslationBlock[]>()
      .notNull()
      .default([]),
    keyExpressions: text("key_expressions", { mode: "json" })
      .$type<KeyExpression[]>()
      .notNull()
      .default([]),
    rawAiResponse: text("raw_ai_response").notNull().default(""),
    version: integer("version").notNull().default(1),
    translatedAt: integer("translated_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("youtube_materials_user_video_unique").on(table.userId, table.youtubeVideoId),
    index("youtube_materials_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);
