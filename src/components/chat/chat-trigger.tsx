"use client"

import { MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useChatPanel } from "./chat-provider"
import { useModuleContext } from "@/hooks/use-module-context"
import { features } from "@/config/features"

export function ChatTrigger() {
  const { hasChat } = useModuleContext()
  const { toggle } = useChatPanel()

  if (!features.chat.enabled || !hasChat) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={toggle}
        >
          <MessageCircle className="size-4" />
          <span className="hidden sm:inline">Frage stellen</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Experten-Chat öffnen</TooltipContent>
    </Tooltip>
  )
}
