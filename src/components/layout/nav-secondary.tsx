"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"

import { secondaryNavigation } from "@/config/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary() {
  const pathname = usePathname()

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupLabel>Ressourcen</SidebarGroupLabel>
      <SidebarMenu>
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.url
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
