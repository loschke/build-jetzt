import { requireAuth } from "@/lib/api-guards"
import { getUserChats } from "@/lib/db/queries/chats"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const chats = await getUserChats(auth.user.id)
  return Response.json(chats)
}
