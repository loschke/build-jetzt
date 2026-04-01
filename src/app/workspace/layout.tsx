import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { ManagementShell } from "@/components/layout/management-shell"
import type { NavItem } from "@/components/layout/management-shell"
import { features } from "@/config/features"

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/workspace/experts", label: "Meine Experten", icon: "Users" },
  { href: "/workspace/projects", label: "Meine Projekte", icon: "FolderOpen" },
  { href: "/artifacts", label: "Meine Dateien", icon: "Layers" },
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

  const navItems: NavItem[] = [
    ...(features.userSkills.enabled
      ? [{ href: "/workspace/skills", label: "Meine Quicktasks", icon: "Zap" } as NavItem]
      : []),
    ...BASE_NAV_ITEMS,
  ]

  return (
    <ManagementShell title="Workspace" backHref="/" items={navItems}>
      {children}
    </ManagementShell>
  )
}
