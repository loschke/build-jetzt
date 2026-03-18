import { eq, and, asc, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { projectDocuments } from "@/lib/db/schema/project-documents"
import { projects } from "@/lib/db/schema/projects"

/** Get all documents for a project (sorted by sortOrder, then createdAt). */
export async function getProjectDocuments(projectId: string) {
  const db = getDb()
  return db
    .select({
      id: projectDocuments.id,
      title: projectDocuments.title,
      mimeType: projectDocuments.mimeType,
      tokenCount: projectDocuments.tokenCount,
      createdAt: projectDocuments.createdAt,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(asc(projectDocuments.sortOrder), asc(projectDocuments.createdAt))
}

/** Get title + content for prompt injection. */
export async function getProjectDocumentsForPrompt(projectId: string) {
  const db = getDb()
  return db
    .select({
      title: projectDocuments.title,
      content: projectDocuments.content,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId))
    .orderBy(asc(projectDocuments.sortOrder), asc(projectDocuments.createdAt))
}

/** Get document count and total token count for limit checks. */
export async function getDocumentStats(projectId: string) {
  const db = getDb()
  const [result] = await db
    .select({
      count: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${projectDocuments.tokenCount}), 0)::int`,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.projectId, projectId))
  return result ?? { count: 0, totalTokens: 0 }
}

/** Create a new project document. */
export async function createProjectDocument(
  projectId: string,
  data: { title: string; content: string; mimeType: string; tokenCount: number }
) {
  const db = getDb()
  const id = nanoid(12)
  const [doc] = await db
    .insert(projectDocuments)
    .values({
      id,
      projectId,
      title: data.title,
      content: data.content,
      mimeType: data.mimeType,
      tokenCount: data.tokenCount,
    })
    .returning()
  return doc
}

/** Delete a document with ownership check via projects join. */
export async function deleteProjectDocument(documentId: string, userId: string) {
  const db = getDb()

  // Verify ownership through project
  const [doc] = await db
    .select({ id: projectDocuments.id, projectId: projectDocuments.projectId })
    .from(projectDocuments)
    .innerJoin(projects, eq(projectDocuments.projectId, projects.id))
    .where(and(eq(projectDocuments.id, documentId), eq(projects.userId, userId)))
    .limit(1)

  if (!doc) return null

  const [deleted] = await db
    .delete(projectDocuments)
    .where(eq(projectDocuments.id, documentId))
    .returning()
  return deleted ?? null
}
