import { eq, and, sql } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { artifacts } from "@/lib/db/schema/artifacts"
import { chats } from "@/lib/db/schema/chats"

interface CreateArtifactInput {
  chatId: string
  messageId?: string
  type: "markdown" | "html" | "code" | "quiz"
  title: string
  content: string
  language?: string
}

export async function createArtifact(input: CreateArtifactInput) {
  const db = getDb()

  // Defense-in-depth: verify referenced chatId exists
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.id, input.chatId))
    .limit(1)

  if (!chat) {
    throw new Error(`Chat ${input.chatId} not found`)
  }

  const id = nanoid(12)
  const [artifact] = await db
    .insert(artifacts)
    .values({
      id,
      chatId: input.chatId,
      messageId: input.messageId ?? null,
      type: input.type,
      title: input.title,
      content: input.content,
      language: input.language ?? null,
    })
    .returning()
  return artifact
}

export async function getArtifactById(id: string) {
  const db = getDb()
  const [artifact] = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.id, id))
    .limit(1)
  return artifact ?? null
}

export async function getArtifactsByChatId(chatId: string, userId: string) {
  const db = getDb()
  return db
    .select({
      id: artifacts.id,
      messageId: artifacts.messageId,
      chatId: artifacts.chatId,
      type: artifacts.type,
      title: artifacts.title,
      content: artifacts.content,
      language: artifacts.language,
      fileUrl: artifacts.fileUrl,
      version: artifacts.version,
      createdAt: artifacts.createdAt,
      updatedAt: artifacts.updatedAt,
    })
    .from(artifacts)
    .innerJoin(chats, eq(artifacts.chatId, chats.id))
    .where(and(eq(artifacts.chatId, chatId), eq(chats.userId, userId)))
    .orderBy(artifacts.createdAt)
}

export async function updateArtifactContent(
  id: string,
  userId: string,
  content: string,
  expectedVersion?: number
) {
  const db = getDb()

  // Ownership check: artifact → chat → userId
  const [artifact] = await db
    .select({ chatId: artifacts.chatId })
    .from(artifacts)
    .where(eq(artifacts.id, id))
    .limit(1)

  if (!artifact) return null

  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(and(eq(chats.id, artifact.chatId), eq(chats.userId, userId)))
    .limit(1)

  if (!chat) return null

  // Build WHERE clause with optional optimistic locking
  const conditions = [eq(artifacts.id, id)]
  if (expectedVersion !== undefined) {
    conditions.push(eq(artifacts.version, expectedVersion))
  }

  const [updated] = await db
    .update(artifacts)
    .set({
      content,
      version: sql`${artifacts.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning()

  // If expectedVersion was provided and no rows updated, it's a version conflict
  if (!updated && expectedVersion !== undefined) return null

  return updated ?? null
}
