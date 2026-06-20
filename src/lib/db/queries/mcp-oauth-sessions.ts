import { eq, lt } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { mcpOauthSessions } from "@/lib/db/schema/mcp-oauth-sessions"

/** Session-TTL in Millisekunden (10 Min). */
export const MCP_OAUTH_SESSION_TTL_MS = 10 * 60 * 1000

export interface CreateOauthSessionInput {
  stateNonce: string
  userId: string
  serverId: string
  codeVerifier: string
  expiresAt: Date
}

/** PKCE-Session anlegen (zwischen Initiate und Callback). */
export async function createMcpOauthSession(data: CreateOauthSessionInput) {
  const db = getDb()
  const [row] = await db.insert(mcpOauthSessions).values(data).returning()
  return row
}

/** Session per State-Nonce laden. */
export async function getMcpOauthSession(stateNonce: string) {
  const db = getDb()
  const [row] = await db
    .select()
    .from(mcpOauthSessions)
    .where(eq(mcpOauthSessions.stateNonce, stateNonce))
    .limit(1)
  return row ?? null
}

/** Session single-use konsumieren (löschen). */
export async function deleteMcpOauthSession(stateNonce: string) {
  const db = getDb()
  await db
    .delete(mcpOauthSessions)
    .where(eq(mcpOauthSessions.stateNonce, stateNonce))
}

/** Abgelaufene Sessions aufräumen (best-effort, beim Initiate/Callback aufrufbar). */
export async function pruneExpiredMcpOauthSessions(now: Date = new Date()) {
  const db = getDb()
  await db.delete(mcpOauthSessions).where(lt(mcpOauthSessions.expiresAt, now))
}
