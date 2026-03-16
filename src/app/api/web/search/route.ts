import { checkBodySize, requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { webSearchSchema, parseBody } from "@/lib/schemas"
import { webSearch } from "@/lib/web"

export async function POST(req: Request) {
  if (!features.web.enabled) {
    return new Response("Web services disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.web)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const sizeError = checkBodySize(req)
  if (sizeError) return sizeError

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseBody(webSearchSchema, raw)
  if (!parsed.success) return parsed.response

  const { query, limit, location } = parsed.data

  try {
    const result = await webSearch({
      query: query.trim(),
      limit: limit ?? 10,
      location,
    })
    return Response.json(result)
  } catch (error) {
    console.error("[Web search error]", { error, userId: user.id, query })
    return new Response("Suche fehlgeschlagen", { status: 500 })
  }
}
