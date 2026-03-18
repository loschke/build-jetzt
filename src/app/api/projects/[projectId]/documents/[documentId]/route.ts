import { requireAuth } from "@/lib/api-guards"
import { deleteProjectDocument } from "@/lib/db/queries/project-documents"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; documentId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { documentId } = await params
  const deleted = await deleteProjectDocument(documentId, user.id)
  if (!deleted) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
