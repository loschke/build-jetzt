import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserExperts } from "@/lib/db/queries/experts"
import { WorkspaceExperts } from "@/components/workspace/workspace-experts"

export const dynamic = "force-dynamic"

export default async function WorkspaceExpertsPage() {
  const user = await getUser()
  if (!user) redirect("/")

  let userExperts: Awaited<ReturnType<typeof getUserExperts>> = []
  try {
    userExperts = await getUserExperts(user.id)
  } catch {
    // Table may not exist yet
  }

  return <WorkspaceExperts initialExperts={userExperts} />
}
