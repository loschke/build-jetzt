import { checkBodySize, requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { webScrapeSchema, parseBody } from "@/lib/schemas"
import { webScrape } from "@/lib/web"

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

  const parsed = parseBody(webScrapeSchema, raw)
  if (!parsed.success) return parsed.response

  const { url, formats, onlyMainContent, waitFor } = parsed.data

  try {
    const result = await webScrape({
      url,
      formats,
      onlyMainContent,
      waitFor,
    })
    return Response.json(result)
  } catch (error) {
    console.error("[Web scrape error]", { error, userId: user.id, url })
    return new Response("Scraping fehlgeschlagen", { status: 500 })
  }
}
