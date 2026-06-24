/**
 * In-memory token bucket rate limiter.
 * Tracks request counts per identifier (user ID) with automatic cleanup.
 */

interface TokenBucket {
  tokens: number
  lastRefill: number
}

interface RateLimitConfig {
  /** Bucket name — namespaces the per-user bucket so route types don't share tokens */
  name: string
  /** Max requests in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

const buckets = new Map<string, TokenBucket>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

/** Max window across all configs — used for conservative stale entry cleanup */
const MAX_WINDOW_MS = 120_000

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, bucket] of buckets) {
    if (now - bucket.lastRefill > MAX_WINDOW_MS) {
      buckets.delete(key)
    }
  }
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  cleanup()

  // Namespace by config name so each route type gets an independent bucket
  // (e.g. widget polling on `mcpPoll` does not starve the user's `chat`/`api`).
  const key = `${identifier}:${config.name}`
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.lastRefill >= config.windowMs) {
    // New window: reset tokens
    buckets.set(key, { tokens: config.maxRequests - 1, lastRefill: now })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (bucket.tokens > 0) {
    bucket.tokens--
    return { allowed: true, retryAfterMs: 0 }
  }

  const retryAfterMs = config.windowMs - (now - bucket.lastRefill)
  return { allowed: false, retryAfterMs }
}

// Pre-configured limiters for different route types
export const RATE_LIMITS = {
  chat: { name: "chat", maxRequests: 20, windowMs: 60_000 },
  api: { name: "api", maxRequests: 60, windowMs: 60_000 },
  web: { name: "web", maxRequests: 30, windowMs: 60_000 },
  upload: { name: "upload", maxRequests: 10, windowMs: 60_000 },
  voiceChat: { name: "voiceChat", maxRequests: 10, windowMs: 60_000 },
  // MCP App widget polling (job_status etc.) — own bucket, headroom for ~2s polls + actions.
  mcpPoll: { name: "mcpPoll", maxRequests: 120, windowMs: 60_000 },
} as const

export function rateLimitResponse(retryAfterMs: number): Response {
  return new Response("Zu viele Anfragen. Bitte kurz warten.", {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    },
  })
}
