import { requireAuth } from "@/lib/api-guards"
import { getProjectById, updateProject, deleteProject } from "@/lib/db/queries/projects"
import { canAccessProject } from "@/lib/db/queries/access"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { updateProjectSchema } from "@/lib/validations/project"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const project = await getProjectById(projectId)
  return Response.json({ ...project, role: access.role, isOwner: access.isOwner })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params

  // Verify access (owner or editor)
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Ungültiges JSON" }, { status: 400 })
  }

  const parsed = updateProjectSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Ungültige Anfrage"
    return Response.json({ error: firstError }, { status: 400 })
  }

  // Editors may not change isArchived
  if (!access.isOwner && parsed.data.isArchived !== undefined) {
    return Response.json({ error: "Nur der Owner kann Projekte archivieren" }, { status: 403 })
  }

  // updateProject uses userId-scoped WHERE for owners.
  // For editors, we need the project owner's userId.
  const project = await getProjectById(projectId)
  if (!project) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const updated = await updateProject(projectId, project.userId, parsed.data)
  if (!updated) {
    return Response.json({ error: "Aktualisierung fehlgeschlagen" }, { status: 500 })
  }

  return Response.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { projectId } = await params
  const deleted = await deleteProject(projectId, user.id)
  if (!deleted) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
