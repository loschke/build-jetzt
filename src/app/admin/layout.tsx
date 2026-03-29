import { redirect } from "next/navigation"
import { getUser } from "@/lib/auth"
import { getUserRole } from "@/lib/db/queries/users"
import { isAdminRole, isAdminEmail } from "@/lib/admin-guard"
import { ManagementShell } from "@/components/layout/management-shell"
import type { NavItem } from "@/components/layout/management-shell"

const BASE_NAV_ITEMS: NavItem[] = [
  { href: "/admin/skills", label: "Skills", icon: "BookOpen" },
  { href: "/admin/experts", label: "Experts", icon: "Users" },
  { href: "/admin/models", label: "Models", icon: "Cpu" },
  { href: "/admin/mcp-servers", label: "MCP Servers", icon: "Plug" },
  { href: "/admin/credits", label: "Credits", icon: "Coins" },
  { href: "/admin/features", label: "Features", icon: "Activity" },
]

const SUPERADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: "ShieldCheck" },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()

  if (!user) {
    redirect("/")
  }

  const role = await getUserRole(user.id)
  const hasAccess = isAdminRole(role) || isAdminEmail(user.email)

  if (!hasAccess) {
    redirect("/")
  }

  const items = [
    ...BASE_NAV_ITEMS,
    ...(role === "superadmin" ? SUPERADMIN_NAV_ITEMS : []),
  ]

  return (
    <ManagementShell title="Admin" backHref="/" items={items}>
      {children}
    </ManagementShell>
  )
}
