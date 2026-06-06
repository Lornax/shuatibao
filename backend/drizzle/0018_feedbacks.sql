CREATE TYPE "public"."feedback_kind" AS ENUM('user_text', 'auto_error');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" "feedback_kind" DEFAULT 'user_text' NOT NULL,
	"content" text NOT NULL,
	"context" jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedbacks_created_idx" ON "feedbacks" USING btree ("created_at");