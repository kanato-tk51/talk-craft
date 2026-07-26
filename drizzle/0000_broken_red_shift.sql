CREATE TABLE `expressions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`meaning_ja` text DEFAULT '' NOT NULL,
	`expression_en` text NOT NULL,
	`normalized_expression_en` text NOT NULL,
	`alternative_expressions` text DEFAULT '[]' NOT NULL,
	`examples` text DEFAULT '[]' NOT NULL,
	`related_words` text DEFAULT '[]' NOT NULL,
	`usage_notes` text DEFAULT '' NOT NULL,
	`pronunciation_notes` text DEFAULT '' NOT NULL,
	`learning_status` text DEFAULT 'new' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`last_reviewed_at` integer,
	`next_review_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "expressions_learning_status_check" CHECK("expressions"."learning_status" in ('new', 'practicing', 'active', 'mastered', 'archived')),
	CONSTRAINT "expressions_priority_check" CHECK("expressions"."priority" in ('high', 'medium', 'low'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expressions_user_normalized_unique` ON `expressions` (`user_id`,`normalized_expression_en`);--> statement-breakpoint
CREATE INDEX `expressions_user_updated_at_idx` ON `expressions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `session_expressions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`expression_id` text NOT NULL,
	`expression_en_snapshot` text NOT NULL,
	`meaning_ja_snapshot` text DEFAULT '' NOT NULL,
	`planned_to_use` integer DEFAULT true NOT NULL,
	`usage_status` text DEFAULT 'unknown' NOT NULL,
	`usage_evaluation` text DEFAULT '' NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`carry_over_to_next` integer DEFAULT false NOT NULL,
	`sequence` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expression_id`) REFERENCES `expressions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "session_expressions_sequence_check" CHECK("session_expressions"."sequence" >= 0),
	CONSTRAINT "session_expressions_usage_status_check" CHECK("session_expressions"."usage_status" in ('used', 'not_used', 'unknown'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_expressions_session_expression_unique` ON `session_expressions` (`session_id`,`expression_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_expressions_session_sequence_unique` ON `session_expressions` (`session_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `generated_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`prompt_type` text NOT NULL,
	`template_key` text NOT NULL,
	`template_version` text NOT NULL,
	`schema_version` text,
	`input_snapshot` text NOT NULL,
	`rendered_content` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "generated_prompts_revision_check" CHECK("generated_prompts"."revision" >= 1),
	CONSTRAINT "generated_prompts_prompt_type_check" CHECK("generated_prompts"."prompt_type" in ('conversation_start', 'review_output'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generated_prompts_session_type_revision_unique` ON `generated_prompts` (`session_id`,`prompt_type`,`revision`);--> statement-breakpoint
CREATE TABLE `ai_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`provider_type` text DEFAULT 'custom' NOT NULL,
	`website_url` text,
	`supports_voice` integer,
	`supports_text` integer,
	`supports_file_export` integer,
	`prompt_template_type` text,
	`notes` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_providers_provider_type_check" CHECK("ai_providers"."provider_type" in ('preset', 'custom', 'api', 'unknown'))
);
--> statement-breakpoint
CREATE INDEX `ai_providers_user_id_idx` ON `ai_providers` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`ai_provider_id` text,
	`provider_name_snapshot` text DEFAULT '' NOT NULL,
	`provider_website_url_snapshot` text,
	`model_name` text DEFAULT '' NOT NULL,
	`title` text NOT NULL,
	`topic` text NOT NULL,
	`objective` text NOT NULL,
	`situation` text DEFAULT '' NOT NULL,
	`user_role` text DEFAULT '' NOT NULL,
	`ai_role` text DEFAULT '' NOT NULL,
	`conversation_type` text DEFAULT 'unknown' NOT NULL,
	`difficulty` text DEFAULT 'unspecified' NOT NULL,
	`planned_duration_minutes` integer,
	`actual_duration_minutes` integer,
	`scheduled_at` integer,
	`started_at` integer,
	`completed_at` integer,
	`status` text DEFAULT 'draft' NOT NULL,
	`transcript_completeness` text DEFAULT 'unknown' NOT NULL,
	`preparation_notes` text DEFAULT '' NOT NULL,
	`reflection_notes` text DEFAULT '' NOT NULL,
	`external_conversation_url` text,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ai_provider_id`) REFERENCES `ai_providers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "sessions_conversation_type_check" CHECK("sessions"."conversation_type" in ('voice', 'text', 'mixed', 'unknown')),
	CONSTRAINT "sessions_difficulty_check" CHECK("sessions"."difficulty" in ('beginner', 'intermediate', 'advanced', 'unspecified')),
	CONSTRAINT "sessions_status_check" CHECK("sessions"."status" in ('draft', 'ready', 'in_progress', 'awaiting_review', 'completed', 'archived')),
	CONSTRAINT "sessions_transcript_completeness_check" CHECK("sessions"."transcript_completeness" in ('complete', 'partial', 'summary_only', 'manual', 'unknown')),
	CONSTRAINT "sessions_planned_duration_check" CHECK("sessions"."planned_duration_minutes" is null or "sessions"."planned_duration_minutes" between 1 and 240),
	CONSTRAINT "sessions_actual_duration_check" CHECK("sessions"."actual_duration_minutes" is null or "sessions"."actual_duration_minutes" between 1 and 1440),
	CONSTRAINT "sessions_version_check" CHECK("sessions"."version" >= 1)
);
--> statement-breakpoint
CREATE INDEX `sessions_user_scheduled_at_idx` ON `sessions` (`user_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_status_idx` ON `sessions` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`english_level` text,
	`native_language` text DEFAULT 'ja' NOT NULL,
	`target_language` text DEFAULT 'en' NOT NULL,
	`timezone` text DEFAULT 'Asia/Tokyo' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `youtube_materials` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`youtube_video_id` text NOT NULL,
	`source_url` text NOT NULL,
	`title` text NOT NULL,
	`channel_name` text DEFAULT '' NOT NULL,
	`thumbnail_url` text NOT NULL,
	`caption_language_code` text NOT NULL,
	`caption_track_name` text DEFAULT '' NOT NULL,
	`caption_source` text DEFAULT 'creator' NOT NULL,
	`transcript_text` text NOT NULL,
	`transcript_blocks` text NOT NULL,
	`translation_prompt` text NOT NULL,
	`prompt_version` text DEFAULT '5.0' NOT NULL,
	`summary_ja` text DEFAULT '' NOT NULL,
	`translation_blocks` text DEFAULT '[]' NOT NULL,
	`key_expressions` text DEFAULT '[]' NOT NULL,
	`raw_ai_response` text DEFAULT '' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`translated_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `youtube_materials_user_video_unique` ON `youtube_materials` (`user_id`,`youtube_video_id`);--> statement-breakpoint
CREATE INDEX `youtube_materials_user_updated_at_idx` ON `youtube_materials` (`user_id`,`updated_at`);