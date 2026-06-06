CREATE TYPE "public"."question_type" AS ENUM('single', 'multi', 'judge', 'short', 'blank');--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "type" "question_type" DEFAULT 'single' NOT NULL;