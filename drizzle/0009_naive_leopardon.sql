CREATE TABLE "chat_shares" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"owner_id" text NOT NULL,
	"shared_with_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_shares_chat_user_uniq" UNIQUE("chat_id","shared_with_id")
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_user_uniq" UNIQUE("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "skill_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"skill_id" text NOT NULL,
	"filename" text NOT NULL,
	"content" text NOT NULL,
	"category" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_shares" ADD CONSTRAINT "chat_shares_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_resources" ADD CONSTRAINT "skill_resources_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_shares_shared_with_id_idx" ON "chat_shares" USING btree ("shared_with_id");--> statement-breakpoint
CREATE INDEX "chat_shares_chat_id_idx" ON "chat_shares" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "project_members_user_id_idx" ON "project_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "skill_resources_skill_filename_idx" ON "skill_resources" USING btree ("skill_id","filename");--> statement-breakpoint
CREATE INDEX "skill_resources_skill_id_idx" ON "skill_resources" USING btree ("skill_id");