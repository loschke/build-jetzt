import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core"
import { projects } from "./projects"

export const projectDocuments = pgTable("project_documents", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  mimeType: text("mime_type"),
  tokenCount: integer("token_count").default(0).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  index("project_documents_project_idx").on(t.projectId),
])
