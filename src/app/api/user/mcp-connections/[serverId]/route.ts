import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { isOAuthMcpAvailable } from "@/lib/mcp/oauth-connections"
import { deleteMcpConnection } from "@/lib/db/queries/user-mcp-connections"

/**
 * DELETE /api/user/mcp-connections/[serverId]
 * Trennt die Verbindung — löscht die gespeicherten Tokens des Users für diesen Server.
 * (Kein aktives Token-Revoke beim Anbieter im MVP; Tokens laufen ab.)
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  if (!isOAuthMcpAvailable()) {
    return Response.json({ error: "OAuth-MCP ist nicht verfügbar." }, { status: 404 })
  }

  const { serverId } = await params
  await deleteMcpConnection(auth.user.id, serverId)
  return Response.json({ success: true })
}
