import { getUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUserProjects } from "@/lib/db/queries/projects"
import { WorkspaceProjects } from "@/components/workspace/workspace-projects"

export const dynamic = "force-dynamic"

export default async function WorkspaceProjectsPage() {
  const user = await getUser()
  if (!user) redirect("/")

  let projects: Awaited<ReturnType<typeof getUserProjects>> = []
  try {
    projects = await getUserProjects(user.id)
  } catch {
    // Table may not exist yet
  }

  return <WorkspaceProjects initialProjects={projects} />
}
