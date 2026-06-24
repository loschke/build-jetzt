import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { readUiResource } from "@/lib/mcp/app-host"

/**
 * POST /api/mcp/app-resource
 * Reads a `ui://` MCP Apps resource (the widget HTML) over the user's own
 * authenticated MCP connection. Used by McpAppFrame to load the iframe content.
 */
const bodySchema = z.object({
  serverId: z.string().min(1).max(64),
  uri: z.string().min(1).max(512).startsWith("ui://"),
})

export async function POST(request: Request) {
  if (!features.mcpApps.enabled) {
    return new Response("MCP Apps disabled", { status: 404 })
  }

  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const userId = authResult.user.id

  const rateCheck = checkRateLimit(userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 })
  }

  const result = await readUiResource(userId, parsed.serverId, parsed.uri)
  if ("error" in result) {
    const status = result.error === "not_connected" ? 409 : result.error === "server_not_found" ? 404 : 502
    return Response.json({ error: result.error }, { status })
  }

  return Response.json({ contents: result.contents })
}
