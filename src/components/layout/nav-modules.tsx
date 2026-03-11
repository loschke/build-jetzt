"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import { primaryModules } from "@/config/navigation"
import { cn } from "@/lib/utils"

export function NavModules() {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="micro-label">Module</SidebarGroupLabel>
      <SidebarMenu>
        {primaryModules.map((item) => {
          const isActive = pathname === item.url

          // Collapsed: Compact icon button with tooltip
          if (isCollapsed) {
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon className="size-4 text-primary" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          // Expanded: Card layout with icon, title, description
          return (
            <SidebarMenuItem key={item.url}>
              <Link
                href={item.url}
                className={cn(
                  "flex flex-col gap-1.5 border p-3 transition-all duration-200 hover:bg-sidebar-accent hover:shadow-sm",
                  isActive
                    ? "border-primary/40 bg-sidebar-accent shadow-sm"
                    : "border-sidebar-border hover:border-sidebar-accent-foreground/20"
                )}
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-8 items-center justify-center bg-sidebar-accent">
                    <item.icon className="size-4 text-primary" />
                  </span>
                  {item.badge && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      <span className="inline-block size-1 rounded-full bg-primary" />
                      {item.badge}
                    </span>
                  )}
                </div>
                <div>
                  <span
                    className={cn(
                      "text-sm font-bold leading-tight tracking-tight",
                      isActive && "text-foreground"
                    )}
                  >
                    {item.title}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {item.description}
                  </p>
                </div>
              </Link>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
