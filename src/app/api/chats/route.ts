import { requireAuth } from "@/lib/api-guards"
import { getUserChats } from "@/lib/db/queries/chats"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1), 200)
  const cursor = searchParams.get("cursor") ?? undefined

  const result = await getUserChats(auth.user.id, { limit, cursor })
  return Response.json(result, {
    headers: { "Cache-Control": "private, max-age=10" },
  })
}
