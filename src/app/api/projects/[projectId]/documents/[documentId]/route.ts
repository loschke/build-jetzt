import { requireAuth } from "@/lib/api-guards"
import { canAccessProject } from "@/lib/db/queries/access"
import {
  deleteProjectDocument,
  getProjectDocumentById,
  getDocumentStats,
  updateProjectDocument,
} from "@/lib/db/queries/project-documents"
import {
  PROJECT_DOCS_TOKEN_BUDGET,
  PROJECT_DOCS_MAX_FILE_SIZE,
} from "@/config/ai"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId, documentId } = await params

  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const doc = await getProjectDocumentById(documentId, projectId)
  if (!doc) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json(doc)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId, documentId } = await params

  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  let body: { content?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const content = body.content
  if (typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "Inhalt darf nicht leer sein" }, { status: 400 })
  }

  // Byte-size check (consistent with upload limit)
  const byteSize = new TextEncoder().encode(content).length
  if (byteSize > PROJECT_DOCS_MAX_FILE_SIZE) {
    return Response.json(
      { error: `Inhalt zu groß (max ${PROJECT_DOCS_MAX_FILE_SIZE / 1000}KB)` },
      { status: 400 }
    )
  }

  const existing = await getProjectDocumentById(documentId, projectId)
  if (!existing) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const tokenCount = Math.ceil(content.length / 4)

  // Token budget check — exclude this document's current tokens from the sum,
  // otherwise editing a near-budget file would always fail against itself.
  const stats = await getDocumentStats(projectId)
  const projectedTotal = stats.totalTokens - existing.tokenCount + tokenCount
  if (projectedTotal > PROJECT_DOCS_TOKEN_BUDGET) {
    return Response.json(
      {
        error: `Token-Budget überschritten (${projectedTotal} > ${PROJECT_DOCS_TOKEN_BUDGET})`,
      },
      { status: 400 }
    )
  }

  const updated = await updateProjectDocument(documentId, projectId, { content, tokenCount })
  if (!updated) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId, documentId } = await params

  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const deleted = await deleteProjectDocument(documentId, projectId)
  if (!deleted) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
