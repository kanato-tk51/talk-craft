ALTER TABLE "youtube_materials" ALTER COLUMN "prompt_version" SET DEFAULT '4.0';--> statement-breakpoint
ALTER TABLE "youtube_materials" ADD COLUMN "caption_source" varchar(20) DEFAULT 'creator' NOT NULL;--> statement-breakpoint
UPDATE "youtube_materials"
SET "caption_source" = 'automatic'
WHERE
	"caption_track_name" ILIKE '%auto-generated%'
	OR "caption_track_name" ILIKE '%automatic%'
	OR "caption_track_name" ILIKE '%自動生成%';
