import Link from "next/link"
import { Settings } from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ChatTrigger } from "@/components/chat/chat-trigger"
import { ThemeToggle } from "./theme-toggle"
import { NavUser } from "./nav-user"
import type { AppUser } from "@/lib/auth"

interface AppHeaderProps {
  user: AppUser | null
}

export function AppHeader({ user }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 bg-primary px-4 text-primary-foreground">
      <SidebarTrigger className="-ml-1 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" />
      <Separator orientation="vertical" className="mr-2 h-4 bg-primary-foreground/25" />
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <ChatTrigger />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground" asChild>
              <Link href="/settings">
                <Settings className="size-4" />
                <span className="sr-only">Einstellungen</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Einstellungen</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <NavUser user={user} />
      </div>
    </header>
  )
}
