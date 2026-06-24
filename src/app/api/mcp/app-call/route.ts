import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { features } from "@/config/features"
import { callAppTool } from "@/lib/mcp/app-host"

/**
 * POST /api/mcp/app-call
 * Proxies an app-initiated `tools/call` from a sandboxed MCP App widget to the
 * user's OWN authenticated MCP connection (e.g. job_status polling). The widget
 * can only reach tools on its own server — capability gating is structural
 * (single-server connect) plus the server's enabledTools allowlist.
 */
const bodySchema = z.object({
  serverId: z.string().min(1).max(64),
  toolName: z.string().min(1).max(128),
  arguments: z.record(z.string(), z.unknown()).default({}),
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

  const result = await callAppTool(userId, parsed.serverId, parsed.toolName, parsed.arguments)
  if ("error" in result) {
    const status =
      result.error === "not_connected" ? 409 :
      result.error === "server_not_found" ? 404 :
      result.error === "tool_not_allowed" ? 403 : 502
    return Response.json({ error: result.error, detail: result.detail }, { status })
  }

  return Response.json({ result: result.result })
}
