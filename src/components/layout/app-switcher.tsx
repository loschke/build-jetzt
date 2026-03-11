"use client"

import { ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { apps, currentApp } from "@/config/apps"
import { brand } from "@/config/brand"

export function AppSwitcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center bg-primary text-primary-foreground">
            <currentApp.icon className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{currentApp.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {brand.name}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
        align="start"
        sideOffset={4}
      >
        {apps.map((app) => (
          <DropdownMenuItem key={app.name} asChild>
            <a
              href={app.url}
              className="flex items-center gap-3"
            >
              <app.icon className="size-4 text-primary" />
              <div className="grid text-sm leading-tight">
                <span className="font-medium">{app.name}</span>
                <span className="text-xs text-muted-foreground">
                  {app.description}
                </span>
              </div>
              {app.active && (
                <span className="ml-auto text-xs text-primary">Aktiv</span>
              )}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
