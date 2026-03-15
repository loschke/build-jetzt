import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { listMemories } from "@/lib/memory"

export async function GET() {
  if (!features.memory.enabled) {
    return Response.json({ error: "Memory ist deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  try {
    const memories = await listMemories(auth.user.id)
    return Response.json({ memories })
  } catch (error) {
    console.error("[memory] List failed:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Memory-Service nicht erreichbar" }, { status: 503 })
  }
}
