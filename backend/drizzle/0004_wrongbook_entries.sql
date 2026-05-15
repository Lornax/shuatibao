CREATE TYPE "public"."wrongbook_source" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wrongbook_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "wrongbook_source" NOT NULL,
	"correct_streak" integer DEFAULT 0 NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wrongbook_entries" ADD CONSTRAINT "wrongbook_entries_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wrongbook_entries" ADD CONSTRAINT "wrongbook_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wrongbook_entries_uniq_idx" ON "wrongbook_entries" USING btree ("question_id","user_id");--> statement-breakpoint
-- 回填：把现有 "最近一次答错" 的题加入错题本 (source=auto, streak=0)
INSERT INTO wrongbook_entries (question_id, user_id, source, correct_streak)
SELECT q.id, latest.user_id, 'auto', 0
FROM questions q
JOIN LATERAL (
  SELECT user_id, is_correct
  FROM attempts
  WHERE question_id = q.id
  ORDER BY attempted_at DESC
  LIMIT 1
) latest ON TRUE
WHERE latest.is_correct = false
ON CONFLICT (question_id, user_id) DO NOTHING;
