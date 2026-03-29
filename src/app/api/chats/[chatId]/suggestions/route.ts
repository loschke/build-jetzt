import { requireAuth } from "@/lib/api-guards"
import { canAccessChat } from "@/lib/db/queries/access"
import { getLastAssistantMetadata } from "@/lib/db/queries/messages"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { chatId } = await params

  if (!chatId || chatId.length > 20 || !/^[a-zA-Z0-9_-]+$/.test(chatId)) {
    return Response.json({ error: "Ungültige Chat-ID" }, { status: 400 })
  }

  const access = await canAccessChat(chatId, auth.user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const metadata = await getLastAssistantMetadata(chatId)
  const suggestedReplies = (metadata?.suggestedReplies as string[]) ?? null

  return Response.json({ suggestedReplies })
}
