CREATE TABLE "youtube_materials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"youtube_video_id" varchar(20) NOT NULL,
	"source_url" text NOT NULL,
	"title" text NOT NULL,
	"channel_name" text DEFAULT '' NOT NULL,
	"thumbnail_url" text NOT NULL,
	"caption_language_code" varchar(20) NOT NULL,
	"caption_track_name" text DEFAULT '' NOT NULL,
	"transcript_text" text NOT NULL,
	"transcript_blocks" jsonb NOT NULL,
	"translation_prompt" text NOT NULL,
	"prompt_version" varchar(20) DEFAULT '1.0' NOT NULL,
	"summary_ja" text DEFAULT '' NOT NULL,
	"translation_blocks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_expressions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_ai_response" text DEFAULT '' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"translated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "youtube_materials" ADD CONSTRAINT "youtube_materials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "youtube_materials_user_video_unique" ON "youtube_materials" USING btree ("user_id","youtube_video_id");--> statement-breakpoint
CREATE INDEX "youtube_materials_user_updated_at_idx" ON "youtube_materials" USING btree ("user_id","updated_at");