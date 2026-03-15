import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { deleteMemory } from "@/lib/memory"

const MEMORY_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ memoryId: string }> }
) {
  if (!features.memory.enabled) {
    return Response.json({ error: "Memory ist deaktiviert" }, { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { memoryId } = await params

  if (!MEMORY_ID_REGEX.test(memoryId)) {
    return Response.json({ error: "Ungültige Memory-ID" }, { status: 400 })
  }

  try {
    await deleteMemory(memoryId)
    return Response.json({ success: true })
  } catch (error) {
    console.error("[memory] Delete failed:", error instanceof Error ? error.message : error)
    return Response.json({ error: "Löschen fehlgeschlagen" }, { status: 500 })
  }
}
