import { requireAuth } from "@/lib/api-guards"
import { canAccessProject } from "@/lib/db/queries/access"
import { removeProjectMember, getProjectMembers } from "@/lib/db/queries/project-members"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

/** DELETE: Remove a member from a project. Owner-only. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId, memberId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess || !access.isOwner) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  // Prevent owner from removing themselves
  const members = await getProjectMembers(projectId)
  const targetMember = members.find((m) => m.id === memberId)
  if (!targetMember) {
    return Response.json({ error: "Mitglied nicht gefunden" }, { status: 404 })
  }
  if (targetMember.role === "owner") {
    return Response.json({ error: "Owner kann nicht entfernt werden" }, { status: 400 })
  }

  const deleted = await removeProjectMember(memberId, projectId)
  if (!deleted) {
    return Response.json({ error: "Mitglied nicht gefunden" }, { status: 404 })
  }

  return Response.json({ success: true })
}
