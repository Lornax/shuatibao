CREATE TYPE "public"."textbook_status" AS ENUM('processing', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "textbook_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"textbook_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"chapter" text,
	"page_start" integer,
	"page_end" integer,
	"content" text NOT NULL,
	"embedding" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "textbooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_size" integer NOT NULL,
	"total_pages" integer DEFAULT 0 NOT NULL,
	"cos_url" text,
	"status" textbook_status DEFAULT 'processing' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"chapter_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "textbook_chunks" ADD CONSTRAINT "textbook_chunks_textbook_id_textbooks_id_fk" FOREIGN KEY ("textbook_id") REFERENCES "public"."textbooks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "textbook_chunks" ADD CONSTRAINT "textbook_chunks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "textbook_chunks_profile_idx" ON "textbook_chunks" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "textbooks_profile_idx" ON "textbooks" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "textbooks_status_idx" ON "textbooks" USING btree ("status");