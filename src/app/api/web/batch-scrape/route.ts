import { checkBodySize } from "@/lib/api-guards"
import { getUser } from "@/lib/auth"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { webBatchScrapeSchema, parseBody } from "@/lib/schemas"
import { webBatchScrape } from "@/lib/web"

export async function POST(req: Request) {
  if (!features.web.enabled) {
    return new Response("Web services disabled", { status: 404 })
  }

  const user = await getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

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

  const parsed = parseBody(webBatchScrapeSchema, raw)
  if (!parsed.success) return parsed.response

  const { urls, formats } = parsed.data

  try {
    const result = await webBatchScrape({ urls, formats })
    return Response.json(result)
  } catch (error) {
    console.error("[Batch scrape error]", { error, userId: user.id, urls })
    return new Response("Batch-Scraping fehlgeschlagen", { status: 500 })
  }
}
