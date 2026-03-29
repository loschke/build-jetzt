import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { ManagementShell } from "@/components/layout/management-shell"
import type { NavItem } from "@/components/layout/management-shell"

const NAV_ITEMS: NavItem[] = [
  { href: "/workspace/skills", label: "Meine Skills", icon: "BookOpen" },
  { href: "/workspace/experts", label: "Meine Experten", icon: "Users" },
  { href: "/workspace/projects", label: "Meine Projekte", icon: "FolderOpen" },
  { href: "/workspace/settings", label: "Einstellungen", icon: "Settings" },
]

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/")
  }

  return (
    <ManagementShell title="Workspace" backHref="/" items={NAV_ITEMS}>
      {children}
    </ManagementShell>
  )
}
