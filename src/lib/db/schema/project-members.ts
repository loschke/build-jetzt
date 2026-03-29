import { pgTable, text, timestamp, index, unique } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const projectMembers = pgTable("project_members", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("editor"), // 'owner' | 'editor'
  addedBy: text("added_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  unique("project_members_project_user_uniq").on(t.projectId, t.userId),
  index("project_members_user_id_idx").on(t.userId),
  index("project_members_project_id_idx").on(t.projectId),
])
