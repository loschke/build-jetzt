import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { getDb } from "@/lib/db"
import { userMcpConnections } from "@/lib/db/schema/user-mcp-connections"

export interface UpsertConnectionInput {
  accessTokenEnc: string
  refreshTokenEnc?: string | null
  tokenType?: string | null
  expiresAt?: Date | null
  scope?: string | null
  status?: string
}

/** Alle OAuth-Verbindungen eines Users (verschlüsselte Tokens). */
export async function getUserMcpConnections(userId: string) {
  const db = getDb()
  return db
    .select()
    .from(userMcpConnections)
    .where(eq(userMcpConnections.userId, userId))
}

/** Einzelne Verbindung (User, Server). */
export async function getMcpConnection(userId: string, serverId: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(userMcpConnections)
    .where(
      and(
        eq(userMcpConnections.userId, userId),
        eq(userMcpConnections.serverId, serverId)
      )
    )
    .limit(1)
  return row ?? null
}

/**
 * Verbindung anlegen oder aktualisieren (eine Zeile pro User+Server).
 * Tokens müssen bereits verschlüsselt übergeben werden.
 */
export async function upsertMcpConnection(
  userId: string,
  serverId: string,
  data: UpsertConnectionInput
) {
  const db = getDb()
  const [row] = await db
    .insert(userMcpConnections)
    .values({
      id: nanoid(12),
      userId,
      serverId,
      accessTokenEnc: data.accessTokenEnc,
      refreshTokenEnc: data.refreshTokenEnc ?? null,
      tokenType: data.tokenType ?? null,
      expiresAt: data.expiresAt ?? null,
      scope: data.scope ?? null,
      status: data.status ?? "active",
    })
    .onConflictDoUpdate({
      target: [userMcpConnections.userId, userMcpConnections.serverId],
      set: {
        accessTokenEnc: data.accessTokenEnc,
        refreshTokenEnc: data.refreshTokenEnc ?? null,
        tokenType: data.tokenType ?? null,
        expiresAt: data.expiresAt ?? null,
        scope: data.scope ?? null,
        status: data.status ?? "active",
        updatedAt: new Date(),
      },
    })
    .returning()
  return row
}

/** Status setzen (z. B. "expired" wenn Refresh endgültig fehlschlägt). */
export async function setMcpConnectionStatus(
  userId: string,
  serverId: string,
  status: string
) {
  const db = getDb()
  const [row] = await db
    .update(userMcpConnections)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(userMcpConnections.userId, userId),
        eq(userMcpConnections.serverId, serverId)
      )
    )
    .returning()
  return row ?? null
}

/** Verbindung löschen (Trennen). userId-scoped (defense-in-depth). */
export async function deleteMcpConnection(userId: string, serverId: string) {
  const db = getDb()
  const [deleted] = await db
    .delete(userMcpConnections)
    .where(
      and(
        eq(userMcpConnections.userId, userId),
        eq(userMcpConnections.serverId, serverId)
      )
    )
    .returning()
  return deleted ?? null
}
