import { after } from "next/server"

import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { getActiveMCPServersForExpert } from "@/config/mcp"
import { resolveChatMcp } from "@/lib/mcp/chat-oauth"
import { connectMCPServers } from "@/lib/mcp"
import { getMcpUiResourceUri } from "@/lib/mcp/ui-apps"
import { getErrorMessage } from "@/lib/errors"

type AppToolMap = Record<string, { serverId: string; resourceUri: string }>

// Short per-user cache: the ui-tool map is stable per session, so we avoid a
// fan-out connect to every MCP server on each page load.
const cache = new Map<string, { map: AppToolMap; ts: number }>()
const CACHE_TTL_MS = 60_000

/**
 * GET /api/mcp/app-tools
 * Returns the map of MCP tools that declare an MCP Apps UI resource, for the
 * user's active+connected servers: { "<serverId>__<tool>": { serverId, resourceUri } }.
 * The client uses it to mount McpAppFrame for matching tool parts. Hot-path
 * (chat route / build-tools) is intentionally untouched — this connects briefly,
 * reads `_meta.ui`, and closes. Result cached per user for 60s.
 */
export async function GET() {
  if (!features.mcpApps.enabled) {
    return new Response("MCP Apps disabled", { status: 404 })
  }

  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const userId = authResult.user.id

  const rateCheck = checkRateLimit(userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const cached = cache.get(userId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json({ tools: cached.map })
  }

  try {
    const active = await getActiveMCPServersForExpert(undefined)
    const { servers, authProviders } = await resolveChatMcp(userId, active)
    if (servers.length === 0) {
      cache.set(userId, { map: {}, ts: Date.now() })
      return Response.json({ tools: {} })
    }

    const handle = await connectMCPServers(servers, authProviders)
    try {
      const tools: AppToolMap = {}
      for (const [name, tool] of Object.entries(handle.tools)) {
        const resourceUri = getMcpUiResourceUri((tool as { _meta?: unknown })._meta)
        if (!resourceUri) continue
        const serverId = name.slice(0, name.indexOf("__"))
        if (serverId) tools[name] = { serverId, resourceUri }
      }
      cache.set(userId, { map: tools, ts: Date.now() })
      return Response.json({ tools })
    } finally {
      after(() => handle.close().catch(() => {}))
    }
  } catch (error) {
    console.warn("[MCP-App] app-tools failed:", getErrorMessage(error))
    return Response.json({ tools: {} })
  }
}
