import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type {
  YoutubeGenerationCheckpoint,
  YoutubeGenerationStatus,
} from "@/modules/youtube/domain/youtube-generation";
import {
  type KeyExpression,
  TRANSLATION_PROMPT_VERSION,
  type TranscriptBlock,
  type TranslationBlock,
  type YoutubeCaptionSource,
} from "@/modules/youtube/domain/youtube-material";

import { users } from "./users";

export const youtubeMaterials = pgTable(
  "youtube_materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    youtubeVideoId: varchar("youtube_video_id", { length: 20 }).notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    channelName: text("channel_name").notNull().default(""),
    thumbnailUrl: text("thumbnail_url").notNull(),
    captionLanguageCode: varchar("caption_language_code", { length: 20 }).notNull(),
    captionTrackName: text("caption_track_name").notNull().default(""),
    captionSource: varchar("caption_source", { length: 20 })
      .$type<YoutubeCaptionSource>()
      .notNull()
      .default("creator"),
    transcriptText: text("transcript_text").notNull(),
    transcriptBlocks: jsonb("transcript_blocks").$type<TranscriptBlock[]>().notNull(),
    translationPrompt: text("translation_prompt").notNull(),
    promptVersion: varchar("prompt_version", { length: 20 })
      .notNull()
      .default(TRANSLATION_PROMPT_VERSION),
    summaryJa: text("summary_ja").notNull().default(""),
    translationBlocks: jsonb("translation_blocks")
      .$type<TranslationBlock[]>()
      .notNull()
      .default([]),
    keyExpressions: jsonb("key_expressions").$type<KeyExpression[]>().notNull().default([]),
    rawAiResponse: text("raw_ai_response").notNull().default(""),
    generationStatus: varchar("generation_status", { length: 20 })
      .$type<YoutubeGenerationStatus>()
      .notNull()
      .default("pending"),
    generationCheckpoint: jsonb("generation_checkpoint").$type<YoutubeGenerationCheckpoint>(),
    generationError: text("generation_error").notNull().default(""),
    version: integer("version").notNull().default(1),
    translatedAt: timestamp("translated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("youtube_materials_user_video_unique").on(table.userId, table.youtubeVideoId),
    index("youtube_materials_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);
