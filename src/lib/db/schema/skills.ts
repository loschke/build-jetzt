import { pgTable, text, timestamp, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const skills = pgTable("skills", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  content: text("content").notNull(), // Markdown body (without frontmatter)
  mode: text("mode").notNull().default("skill"), // 'skill' | 'quicktask'
  category: text("category"), // Quicktask grouping
  icon: text("icon"), // Lucide icon name
  fields: jsonb("fields").$type<SkillFieldSchema[]>().default([]).notNull(),
  outputAsArtifact: boolean("output_as_artifact").default(false).notNull(),
  temperature: jsonb("temperature").$type<number | null>().default(null),
  modelId: text("model_id"),
  userId: text("user_id"), // nullable = global/admin skill
  isPublic: boolean("is_public").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("skills_slug_global_idx").on(t.slug).where(sql`${t.userId} IS NULL`),
  uniqueIndex("skills_slug_per_user_idx").on(t.userId, t.slug).where(sql`${t.userId} IS NOT NULL`),
  index("skills_user_id_idx").on(t.userId),
  index("skills_mode_idx").on(t.mode),
  index("skills_is_active_idx").on(t.isActive),
  index("skills_is_public_idx").on(t.isPublic),
])

/** Field definition for quicktask forms (stored as jsonb) */
export interface SkillFieldSchema {
  key: string
  label: string
  type: "text" | "textarea" | "select"
  required?: boolean
  placeholder?: string
  options?: string[]
}
