CREATE TABLE IF NOT EXISTS "llm_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model" text NOT NULL,
	"kind" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_usage_model_idx" ON "llm_usage" USING btree ("model","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "llm_usage_created_idx" ON "llm_usage" USING btree ("created_at");