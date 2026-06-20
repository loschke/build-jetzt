import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import {
  isOAuthMcpAvailable,
  listActiveOAuthServers,
  deriveConnectionStatus,
} from "@/lib/mcp/oauth-connections"
import { getUserMcpConnections } from "@/lib/db/queries/user-mcp-connections"

/**
 * GET /api/user/mcp-connections
 * Listet OAuth-fähige MCP-Server mit dem Verbindungsstatus des Users.
 * Gibt NIEMALS Klartext-Tokens zurück — nur Status pro Server.
 */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  if (!isOAuthMcpAvailable()) {
    return Response.json({ available: false, servers: [] })
  }

  const [servers, connections] = await Promise.all([
    listActiveOAuthServers(),
    getUserMcpConnections(auth.user.id),
  ])
  const byServer = new Map(connections.map((c) => [c.serverId, c]))

  return Response.json({
    available: true,
    servers: servers.map((s) => ({
      serverId: s.serverId,
      name: s.name,
      description: s.description,
      status: deriveConnectionStatus(byServer.get(s.serverId)),
    })),
  })
}
