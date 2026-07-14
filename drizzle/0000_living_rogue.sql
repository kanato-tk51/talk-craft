CREATE TYPE "public"."learning_status" AS ENUM('new', 'practicing', 'active', 'mastered', 'archived');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."usage_status" AS ENUM('used', 'not_used', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."prompt_type" AS ENUM('conversation_start', 'review_output');--> statement-breakpoint
CREATE TYPE "public"."provider_type" AS ENUM('preset', 'custom', 'api', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."conversation_type" AS ENUM('voice', 'text', 'mixed', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'unspecified');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'ready', 'in_progress', 'awaiting_review', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."transcript_completeness" AS ENUM('complete', 'partial', 'summary_only', 'manual', 'unknown');--> statement-breakpoint
CREATE TABLE "expressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"meaning_ja" text DEFAULT '' NOT NULL,
	"expression_en" text NOT NULL,
	"normalized_expression_en" text NOT NULL,
	"alternative_expressions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_words" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"usage_notes" text DEFAULT '' NOT NULL,
	"pronunciation_notes" text DEFAULT '' NOT NULL,
	"learning_status" "learning_status" DEFAULT 'new' NOT NULL,
	"priority" "priority" DEFAULT 'medium' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"next_review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_expressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"expression_id" uuid NOT NULL,
	"expression_en_snapshot" text NOT NULL,
	"meaning_ja_snapshot" text DEFAULT '' NOT NULL,
	"planned_to_use" boolean DEFAULT true NOT NULL,
	"usage_status" "usage_status" DEFAULT 'unknown' NOT NULL,
	"usage_evaluation" text DEFAULT '' NOT NULL,
	"feedback" text DEFAULT '' NOT NULL,
	"carry_over_to_next" boolean DEFAULT false NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"prompt_type" "prompt_type" NOT NULL,
	"template_key" varchar(120) NOT NULL,
	"template_version" varchar(40) NOT NULL,
	"schema_version" varchar(40),
	"input_snapshot" jsonb NOT NULL,
	"rendered_content" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"provider_type" "provider_type" DEFAULT 'custom' NOT NULL,
	"website_url" text,
	"supports_voice" boolean,
	"supports_text" boolean,
	"supports_file_export" boolean,
	"prompt_template_type" varchar(100),
	"notes" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ai_provider_id" uuid,
	"provider_name_snapshot" varchar(200) DEFAULT '' NOT NULL,
	"provider_website_url_snapshot" text,
	"model_name" varchar(200) DEFAULT '' NOT NULL,
	"title" varchar(120) NOT NULL,
	"topic" varchar(500) NOT NULL,
	"objective" text NOT NULL,
	"situation" text DEFAULT '' NOT NULL,
	"user_role" varchar(500) DEFAULT '' NOT NULL,
	"ai_role" varchar(500) DEFAULT '' NOT NULL,
	"conversation_type" "conversation_type" DEFAULT 'unknown' NOT NULL,
	"difficulty" "difficulty" DEFAULT 'unspecified' NOT NULL,
	"planned_duration_minutes" integer,
	"actual_duration_minutes" integer,
	"scheduled_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"transcript_completeness" "transcript_completeness" DEFAULT 'unknown' NOT NULL,
	"preparation_notes" text DEFAULT '' NOT NULL,
	"reflection_notes" text DEFAULT '' NOT NULL,
	"external_conversation_url" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(320) NOT NULL,
	"english_level" varchar(40),
	"native_language" varchar(20) DEFAULT 'ja' NOT NULL,
	"target_language" varchar(20) DEFAULT 'en' NOT NULL,
	"timezone" text DEFAULT 'Asia/Tokyo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "expressions" ADD CONSTRAINT "expressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_expressions" ADD CONSTRAINT "session_expressions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_expressions" ADD CONSTRAINT "session_expressions_expression_id_expressions_id_fk" FOREIGN KEY ("expression_id") REFERENCES "public"."expressions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_prompts" ADD CONSTRAINT "generated_prompts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_providers" ADD CONSTRAINT "ai_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ai_provider_id_ai_providers_id_fk" FOREIGN KEY ("ai_provider_id") REFERENCES "public"."ai_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expressions_user_normalized_unique" ON "expressions" USING btree ("user_id","normalized_expression_en");--> statement-breakpoint
CREATE INDEX "expressions_user_updated_at_idx" ON "expressions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "session_expressions_session_expression_unique" ON "session_expressions" USING btree ("session_id","expression_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_expressions_session_sequence_unique" ON "session_expressions" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "generated_prompts_session_type_revision_unique" ON "generated_prompts" USING btree ("session_id","prompt_type","revision");--> statement-breakpoint
CREATE INDEX "ai_providers_user_id_idx" ON "ai_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_scheduled_at_idx" ON "sessions" USING btree ("user_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "sessions_user_status_idx" ON "sessions" USING btree ("user_id","status");