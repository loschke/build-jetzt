import { eq, and, asc, isNull, or, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { skills } from "@/lib/db/schema/skills"
import type { SkillFieldSchema } from "@/lib/db/schema/skills"

export interface CreateSkillInput {
  slug: string
  name: string
  description: string
  content: string
  mode?: "skill" | "quicktask"
  category?: string | null
  icon?: string | null
  fields?: SkillFieldSchema[]
  outputAsArtifact?: boolean
  temperature?: number | null
  modelId?: string | null
  userId?: string | null
  isPublic?: boolean
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateSkillInput {
  name?: string
  slug?: string
  description?: string
  content?: string
  mode?: "skill" | "quicktask"
  category?: string | null
  icon?: string | null
  fields?: SkillFieldSchema[]
  outputAsArtifact?: boolean
  temperature?: number | null
  modelId?: string | null
  isPublic?: boolean
  isActive?: boolean
  sortOrder?: number
}

/** Get all active global skills, ordered by sortOrder */
export async function getActiveSkills() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(and(eq(skills.isActive, true), isNull(skills.userId)))
    .orderBy(asc(skills.sortOrder), asc(skills.name))
}

/**
 * Get a single skill by slug.
 * Lookup order: user-owned → (optionally public) → global.
 * Public user-skills are only included when explicitly requested (allowPublic=true),
 * which is safe because load_skill validates slugs against the pre-approved discovery list.
 */
export async function getSkillBySlug(slug: string, userId?: string, allowPublic = false) {
  const db = getDb()

  if (userId) {
    // 1. Check user's own skill
    const [userSkill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.slug, slug), eq(skills.userId, userId)))
      .limit(1)
    if (userSkill) return userSkill
  }

  // 2. Check public user-skills (only when caller explicitly opts in)
  if (allowPublic) {
    const [publicSkill] = await db
      .select()
      .from(skills)
      .where(and(eq(skills.slug, slug), eq(skills.isPublic, true), sql`${skills.userId} IS NOT NULL`))
      .limit(1)
    if (publicSkill) return publicSkill
  }

  // 3. Fallback to global skill
  const [globalSkill] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.slug, slug), isNull(skills.userId)))
    .limit(1)
  return globalSkill ?? null
}

/** Get a single skill by ID */
export async function getSkillById(id: string) {
  const db = getDb()
  const [skill] = await db
    .select()
    .from(skills)
    .where(eq(skills.id, id))
    .limit(1)
  return skill ?? null
}

/** Get all active global quicktasks */
export async function getActiveQuicktasks() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(and(eq(skills.mode, "quicktask"), eq(skills.isActive, true), isNull(skills.userId)))
    .orderBy(asc(skills.sortOrder), asc(skills.name))
}

/** Get all global skills including inactive (admin view) */
export async function getAllSkills() {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(isNull(skills.userId))
    .orderBy(asc(skills.mode), asc(skills.sortOrder), asc(skills.name))
}

// --- User-scoped queries ---

/** Get all skills owned by a user */
export async function getUserSkills(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(eq(skills.userId, userId))
    .orderBy(asc(skills.mode), asc(skills.name))
}

/** Get a single user-owned skill by ID (userId-scoped) */
export async function getUserSkillById(skillId: string, userId: string) {
  const db = getDb()
  const [skill] = await db
    .select()
    .from(skills)
    .where(and(eq(skills.id, skillId), eq(skills.userId, userId)))
    .limit(1)
  return skill ?? null
}

/** Count skills owned by a user (for limit enforcement) */
export async function countUserSkills(userId: string) {
  const db = getDb()
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(skills)
    .where(eq(skills.userId, userId))
  return result?.count ?? 0
}

/** Get all active user skills + public user-skills for chat discovery */
export async function getSkillsForUser(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.isActive, true),
        or(
          eq(skills.userId, userId),
          and(eq(skills.isPublic, true), sql`${skills.userId} IS NOT NULL`),
        ),
      ),
    )
    .orderBy(asc(skills.name))
}

/** Get active user quicktasks + public quicktasks for chat */
export async function getQuicktasksForUser(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.mode, "quicktask"),
        eq(skills.isActive, true),
        or(
          eq(skills.userId, userId),
          and(eq(skills.isPublic, true), sql`${skills.userId} IS NOT NULL`),
        ),
      ),
    )
    .orderBy(asc(skills.name))
}

/** Create a new skill */
export async function createSkill(data: CreateSkillInput) {
  const db = getDb()
  const id = nanoid(12)
  const [skill] = await db
    .insert(skills)
    .values({
      id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      content: data.content,
      mode: data.mode ?? "skill",
      category: data.category ?? null,
      icon: data.icon ?? null,
      fields: data.fields ?? [],
      outputAsArtifact: data.outputAsArtifact ?? false,
      temperature: data.temperature ?? null,
      modelId: data.modelId ?? null,
      userId: data.userId ?? null,
      isPublic: data.isPublic ?? false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return skill
}

/** Update an existing skill. If userId provided, scopes to that user (defense-in-depth). */
export async function updateSkill(id: string, data: UpdateSkillInput, userId?: string) {
  const db = getDb()
  const condition = userId
    ? and(eq(skills.id, id), eq(skills.userId, userId))
    : eq(skills.id, id)
  const [updated] = await db
    .update(skills)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(condition)
    .returning()
  return updated ?? null
}

/** Delete a skill by ID. If userId provided, scopes to that user (defense-in-depth). */
export async function deleteSkill(id: string, userId?: string) {
  const db = getDb()
  const condition = userId
    ? and(eq(skills.id, id), eq(skills.userId, userId))
    : eq(skills.id, id)
  const [deleted] = await db
    .delete(skills)
    .where(condition)
    .returning()
  return deleted ?? null
}

/** Upsert global skill by slug. Used for seeding and admin imports (userId=NULL only). */
export async function upsertSkillBySlug(data: CreateSkillInput) {
  const db = getDb()

  // Check if global skill with this slug exists
  const [existing] = await db
    .select({ id: skills.id })
    .from(skills)
    .where(and(eq(skills.slug, data.slug), isNull(skills.userId)))
    .limit(1)

  if (existing) {
    // Update existing global skill
    const [updated] = await db
      .update(skills)
      .set({
        name: data.name,
        description: data.description,
        content: data.content,
        mode: data.mode ?? "skill",
        category: data.category ?? null,
        icon: data.icon ?? null,
        fields: data.fields ?? [],
        outputAsArtifact: data.outputAsArtifact ?? false,
        temperature: data.temperature ?? null,
        modelId: data.modelId ?? null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(eq(skills.id, existing.id))
      .returning()
    return updated
  }

  // Insert new global skill
  const id = nanoid(12)
  const [skill] = await db
    .insert(skills)
    .values({
      id,
      slug: data.slug,
      name: data.name,
      description: data.description,
      content: data.content,
      mode: data.mode ?? "skill",
      category: data.category ?? null,
      icon: data.icon ?? null,
      fields: data.fields ?? [],
      outputAsArtifact: data.outputAsArtifact ?? false,
      temperature: data.temperature ?? null,
      modelId: data.modelId ?? null,
      userId: null,
      isPublic: false,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()
  return skill
}
