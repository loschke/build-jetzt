import { NextRequest } from "next/server"

export const maxDuration = 60

import { checkBodySize, requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { webCrawlSchema, parseBody } from "@/lib/schemas"
import { webCrawlAsync, webCrawlStatus } from "@/lib/web"

const JOB_ID_PATTERN = /^[a-zA-Z0-9-]+$/

/**
 * POST: Start an async crawl job.
 * Returns { jobId } for status polling via GET.
 */
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

  const parsed = parseBody(webCrawlSchema, raw)
  if (!parsed.success) return parsed.response

  const { url, limit, maxDepth, includePaths, excludePaths, scrapeOptions } =
    parsed.data

  try {
    const result = await webCrawlAsync({
      url,
      limit: limit ?? 10,
      maxDepth,
      includePaths,
      excludePaths,
      scrapeOptions,
    })
    return Response.json({ jobId: result.id })
  } catch (error) {
    console.error("[Web crawl error]", { error, userId: user.id, url })
    return new Response("Crawl fehlgeschlagen", { status: 500 })
  }
}

/**
 * GET: Check crawl job status.
 * Query param: ?jobId=xxx
 */
export async function GET(req: NextRequest) {
  if (!features.web.enabled) {
    return new Response("Web services disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const statusCheck = checkRateLimit(user.id, RATE_LIMITS.web)
  if (!statusCheck.allowed) {
    return rateLimitResponse(statusCheck.retryAfterMs)
  }

  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId || !JOB_ID_PATTERN.test(jobId)) {
    return new Response("Valid jobId required", { status: 400 })
  }

  try {
    const result = await webCrawlStatus(jobId)
    return Response.json(result)
  } catch (error) {
    console.error("[Crawl status error]", { error, userId: user.id, jobId })
    return new Response("Status-Abfrage fehlgeschlagen", { status: 500 })
  }
}
