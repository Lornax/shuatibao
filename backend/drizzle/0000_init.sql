CREATE TYPE "public"."profile_status" AS ENUM('active', 'archived', 'given_up');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('photo', 'manual', 'pdf', 'ai_gen');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chosen" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent_ms" integer DEFAULT 0 NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_name" text NOT NULL,
	"target" text,
	"exam_date" timestamp with time zone,
	"daily_minutes" integer DEFAULT 60 NOT NULL,
	"status" "profile_status" DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"stem" text NOT NULL,
	"options" jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"difficulty" integer DEFAULT 2 NOT NULL,
	"source" "question_source" DEFAULT 'manual' NOT NULL,
	"source_meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attempts" ADD CONSTRAINT "attempts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attempts" ADD CONSTRAINT "attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_question_idx" ON "attempts" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attempts_user_idx" ON "attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "questions_profile_idx" ON "questions" USING btree ("profile_id");