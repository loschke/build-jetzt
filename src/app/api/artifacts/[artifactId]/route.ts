import { z } from "zod"

import { requireAuth } from "@/lib/api-guards"
import { getArtifactById, updateArtifactContent } from "@/lib/db/queries/artifacts"
import { canAccessChat } from "@/lib/db/queries/access"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

const ID_PATTERN = /^[a-zA-Z0-9_-]{1,21}$/

const MAX_ARTIFACT_BODY_SIZE = 1_000_000 // ~1MB

const patchArtifactSchema = z.object({
  content: z.string().min(1).max(500_000),
  expectedVersion: z.number().int().positive().optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { artifactId } = await params

  if (!ID_PATTERN.test(artifactId)) {
    return Response.json({ error: "Invalid artifact ID" }, { status: 400 })
  }

  const artifact = await getArtifactById(artifactId)

  if (!artifact) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Access check: artifact → chat → canAccessChat
  const access = await canAccessChat(artifact.chatId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Return only public fields — exclude chatId, messageId, fileUrl
  return Response.json({
    id: artifact.id,
    title: artifact.title,
    content: artifact.content,
    type: artifact.type,
    language: artifact.language,
    version: artifact.version,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ artifactId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { artifactId } = await params

  if (!ID_PATTERN.test(artifactId)) {
    return Response.json({ error: "Invalid artifact ID" }, { status: 400 })
  }

  // Body size check
  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_ARTIFACT_BODY_SIZE) {
    return Response.json({ error: "Request too large" }, { status: 413 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = patchArtifactSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  const updated = await updateArtifactContent(
    artifactId,
    user.id,
    parsed.data.content,
    parsed.data.expectedVersion
  )

  if (!updated) {
    // Distinguish between not found and version conflict
    if (parsed.data.expectedVersion !== undefined) {
      const existing = await getArtifactById(artifactId)
      if (existing) {
        return Response.json(
          { error: "Version conflict", currentVersion: existing.version },
          { status: 409 }
        )
      }
    }
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    type: updated.type,
    language: updated.language,
    version: updated.version,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  })
}
