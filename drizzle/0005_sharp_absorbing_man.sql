ALTER TABLE "youtube_materials" ALTER COLUMN "prompt_version" SET DEFAULT '3.0';--> statement-breakpoint
ALTER TABLE "youtube_materials" ADD COLUMN "generation_status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "youtube_materials" ADD COLUMN "generation_checkpoint" jsonb;--> statement-breakpoint
ALTER TABLE "youtube_materials" ADD COLUMN "generation_error" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "youtube_materials"
SET "generation_status" = 'completed'
WHERE "translated_at" IS NOT NULL;
