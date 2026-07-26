ALTER TABLE "youtube_materials" ALTER COLUMN "prompt_version" SET DEFAULT '5.0';--> statement-breakpoint
ALTER TABLE "youtube_materials" DROP COLUMN "generation_status";--> statement-breakpoint
ALTER TABLE "youtube_materials" DROP COLUMN "generation_checkpoint";--> statement-breakpoint
ALTER TABLE "youtube_materials" DROP COLUMN "generation_error";