"use client"

import Link from "next/link"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { BrandWordmark } from "@/components/layout/brand-wordmark"

export function SidebarLogo() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg" tooltip="Dashboard">
          <Link href="/dashboard" className={isCollapsed ? "flex justify-center" : ""}>
            <BrandWordmark variant={isCollapsed ? "signet" : "full"} />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
