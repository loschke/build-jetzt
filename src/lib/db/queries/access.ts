/**
 * Centralized access control helpers for collaboration.
 *
 * These replace direct userId === owner checks throughout the codebase.
 * Every route/query that checks chat or project ownership should use these.
 */

import { eq, and } from "drizzle-orm"
import { getDb } from "@/lib/db"
import { chats } from "@/lib/db/schema/chats"
import { projects } from "@/lib/db/schema/projects"
import { projectMembers } from "@/lib/db/schema/project-members"
import { chatShares } from "@/lib/db/schema/chat-shares"

export type ChatAccessResult = {
  hasAccess: boolean
  isOwner: boolean
  via: "owner" | "chat_share" | "project_member" | null
}

export type ProjectAccessResult = {
  hasAccess: boolean
  isOwner: boolean
  role: string | null
}

/**
 * Check if a user can access a chat.
 *
 * Access paths (checked in order):
 * 1. Chat owner → full access
 * 2. Project member (chat is in a shared project) → full access
 * 3. Direct chat share recipient → read-only
 */
export async function canAccessChat(chatId: string, userId: string): Promise<ChatAccessResult> {
  const db = getDb()
  const NO_ACCESS: ChatAccessResult = { hasAccess: false, isOwner: false, via: null }

  // Load chat
  const [chat] = await db
    .select({ userId: chats.userId, projectId: chats.projectId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1)

  if (!chat) return NO_ACCESS

  // 1. Owner check
  if (chat.userId === userId) {
    return { hasAccess: true, isOwner: true, via: "owner" }
  }

  // 2. Project member check (only if chat belongs to a project)
  if (chat.projectId) {
    const [membership] = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, chat.projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1)

    if (membership) {
      return { hasAccess: true, isOwner: false, via: "project_member" }
    }
  }

  // 3. Direct chat share check
  const [share] = await db
    .select({ id: chatShares.id })
    .from(chatShares)
    .where(and(eq(chatShares.chatId, chatId), eq(chatShares.sharedWithId, userId)))
    .limit(1)

  if (share) {
    return { hasAccess: true, isOwner: false, via: "chat_share" }
  }

  return NO_ACCESS
}

/**
 * Check if a user can access a project.
 *
 * Access paths:
 * 1. Project owner → full access, role 'owner'
 * 2. Project member → access per role ('editor')
 */
export async function canAccessProject(
  projectId: string,
  userId: string
): Promise<ProjectAccessResult> {
  const db = getDb()
  const NO_ACCESS: ProjectAccessResult = { hasAccess: false, isOwner: false, role: null }

  // Load project
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) return NO_ACCESS

  // Owner check (fast path — no membership query needed)
  if (project.userId === userId) {
    return { hasAccess: true, isOwner: true, role: "owner" }
  }

  // Member check
  const [membership] = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    )
    .limit(1)

  if (membership) {
    return { hasAccess: true, isOwner: false, role: membership.role }
  }

  return NO_ACCESS
}
