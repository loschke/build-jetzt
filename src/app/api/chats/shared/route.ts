import { requireAuth } from "@/lib/api-guards"
import { getUserSharedChatIds as getPublicSharedChatIds } from "@/lib/db/queries/shared-chats"
import { getUserSharedChatIds as getUserShareChatIds } from "@/lib/db/queries/chat-shares"

/** Returns chatIds the user has shared (public links + user-to-user shares). */
export async function GET() {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const [publicIds, userShareIds] = await Promise.all([
    getPublicSharedChatIds(auth.user.id),
    getUserShareChatIds(auth.user.id),
  ])

  // Merge both sets
  const allIds = new Set([...publicIds, ...userShareIds])
  return Response.json({ chatIds: [...allIds] })
}
