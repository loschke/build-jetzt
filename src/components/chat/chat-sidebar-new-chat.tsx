"use client"

import { SquarePen } from "lucide-react"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

export function ChatSidebarNewChat() {
  function handleNewChat() {
    // ChatView uses replaceState to update the URL to /c/{id} without the Next.js
    // router knowing. This desynchronizes router state from browser URL, making
    // router.push("/") a no-op (router thinks it's already on "/").
    // Hard navigation guarantees a clean slate with fresh component state.
    window.location.href = "/"
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleNewChat} tooltip="Neuer Chat" className="cursor-pointer">
          <SquarePen className="size-4" />
          <span>Neuer Chat</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
