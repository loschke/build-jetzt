import { requireAuth } from "@/lib/api-guards"
import { getChatById } from "@/lib/db/queries/chats"
import { revokeChatShare } from "@/lib/db/queries/chat-shares"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** DELETE: Revoke a chat share. Owner-only. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ chatId: string; shareId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { chatId, shareId } = await params
  const chat = await getChatById(chatId)
  if (!chat || chat.userId !== user.id) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const deleted = await revokeChatShare(shareId, user.id)
  if (!deleted) {
    return Response.json({ error: "Freigabe nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
