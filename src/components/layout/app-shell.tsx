import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ChatProvider } from "@/components/chat/chat-provider"
import { ChatPanel } from "@/components/chat/chat-panel"
import { AppSidebar } from "./app-sidebar"
import { AppHeader } from "./app-header"
import { getUser } from "@/lib/auth"

interface AppShellProps {
  children: React.ReactNode
}

export async function AppShell({ children }: AppShellProps) {
  const user = await getUser()

  return (
    <SidebarProvider>
      <ChatProvider>
        <TooltipProvider>
          {/* Viewport frame — umlaufend, dezent */}
          <div
            className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary"
            aria-hidden="true"
          />
          <AppSidebar />
          <SidebarInset>
            <AppHeader user={user} />
            <div className="flex flex-1 overflow-hidden">
              <main className="flex-1 overflow-y-auto bg-muted/20 p-6">
                {children}
              </main>
              <ChatPanel />
            </div>
          </SidebarInset>
        </TooltipProvider>
      </ChatProvider>
    </SidebarProvider>
  )
}
