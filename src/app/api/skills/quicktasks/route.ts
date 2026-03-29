import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { discoverQuicktasksForUser } from "@/lib/ai/skills/discovery"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const quicktasks = (await discoverQuicktasksForUser(auth.user.id)).map((q) => ({
    slug: q.slug,
    name: q.name,
    description: q.description,
    category: q.category ?? null,
    icon: q.icon ?? null,
    fields: q.fields ?? [],
    outputAsArtifact: q.outputAsArtifact ?? false,
  }))

  return new Response(JSON.stringify(quicktasks), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  })
}
