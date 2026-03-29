import { requireAuth } from "@/lib/api-guards"
import { getChatsSharedWithMe } from "@/lib/db/queries/chat-shares"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** GET: List all chats shared with the current user. */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const chats = await getChatsSharedWithMe(user.id)
  return Response.json(chats)
}
