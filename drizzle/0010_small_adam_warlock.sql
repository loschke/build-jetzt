DROP INDEX "experts_slug_idx";--> statement-breakpoint
DROP INDEX "skills_slug_idx";--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "experts_slug_global_idx" ON "experts" USING btree ("slug") WHERE "experts"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "experts_slug_per_user_idx" ON "experts" USING btree ("user_id","slug") WHERE "experts"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_slug_global_idx" ON "skills" USING btree ("slug") WHERE "skills"."user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_slug_per_user_idx" ON "skills" USING btree ("user_id","slug") WHERE "skills"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "skills_user_id_idx" ON "skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "skills_is_public_idx" ON "skills" USING btree ("is_public");