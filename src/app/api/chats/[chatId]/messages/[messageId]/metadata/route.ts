import { requireAuth } from "@/lib/api-guards"
import { canAccessChat } from "@/lib/db/queries/access"
import { getMessageMetadata } from "@/lib/db/queries/messages"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string; messageId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { chatId, messageId } = await params

  if (!messageId || messageId.length > 20) {
    return Response.json({ error: "Ungültige Message-ID" }, { status: 400 })
  }

  const access = await canAccessChat(chatId, auth.user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const metadata = await getMessageMetadata(messageId, chatId)

  return Response.json({ metadata: metadata ?? {} })
}
