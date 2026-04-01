import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { discoverQuicktasks } from "@/lib/ai/skills/discovery"
import { getQuicktasksForUser } from "@/lib/db/queries/skills"
import { features } from "@/config/features"

export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const rateCheck = checkRateLimit(auth.user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  // Fetch globals + user quicktasks separately to track ownership
  const globalQuicktasks = await discoverQuicktasks()
  const userQuicktaskRows = features.userSkills.enabled
    ? await getQuicktasksForUser(auth.user.id)
    : []

  // Collect user-owned slugs for isOwned flag
  const ownedSlugs = new Set(
    userQuicktaskRows
      .filter((r) => r.userId === auth.user.id)
      .map((r) => r.slug)
  )

  // Merge: user-owned wins over global on slug collision
  const slugMap = new Map<string, { slug: string; name: string; description: string; category: string | null; icon: string | null; fields: unknown[]; outputAsArtifact: boolean; isOwned: boolean }>()

  for (const q of globalQuicktasks) {
    slugMap.set(q.slug, {
      slug: q.slug,
      name: q.name,
      description: q.description,
      category: q.category ?? null,
      icon: q.icon ?? null,
      fields: q.fields ?? [],
      outputAsArtifact: q.outputAsArtifact ?? false,
      isOwned: false,
    })
  }

  for (const row of userQuicktaskRows) {
    slugMap.set(row.slug, {
      slug: row.slug,
      name: row.name,
      description: row.description,
      category: row.category ?? null,
      icon: row.icon ?? null,
      fields: (row.fields as unknown[]) ?? [],
      outputAsArtifact: row.outputAsArtifact,
      isOwned: row.userId === auth.user.id,
    })
  }

  const quicktasks = Array.from(slugMap.values())

  return new Response(JSON.stringify(quicktasks), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  })
}
