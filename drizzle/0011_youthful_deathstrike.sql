ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by" text;--> statement-breakpoint
-- Existing users are already active — mark them as approved
UPDATE "users" SET "status" = 'approved', "approved_at" = NOW() WHERE "status" = 'pending';