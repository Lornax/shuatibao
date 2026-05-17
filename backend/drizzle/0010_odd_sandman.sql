CREATE TYPE "public"."goal_type" AS ENUM('minutes', 'questions');--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "daily_questions" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "goal_type" "goal_type" DEFAULT 'minutes' NOT NULL;