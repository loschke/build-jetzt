"use client"

import { useCallback, useState } from "react"
import { AtSign } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { PromptInputButton } from "@/components/ai-elements/prompt-input"
import type { ExpertConfig } from "@/lib/assistant/types"

const SEARCH_THRESHOLD = 5

interface ExpertPickerProps {
  experts: ExpertConfig[]
  onSelect: (slug: string) => void
}

export function ExpertPicker({ experts, onSelect }: ExpertPickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (slug: string) => {
      onSelect(slug)
      setOpen(false)
    },
    [onSelect]
  )

  if (experts.length <= 1) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton tooltip="Experte waehlen">
          <AtSign className="size-4" />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-64 p-0"
      >
        <Command>
          {experts.length >= SEARCH_THRESHOLD && (
            <CommandInput placeholder="Experte suchen..." />
          )}
          <CommandList>
            <CommandEmpty>Kein Experte gefunden.</CommandEmpty>
            <CommandGroup>
              {experts.map((expert) => (
                <CommandItem
                  key={expert.slug}
                  value={`${expert.name} ${expert.description}`}
                  onSelect={() => handleSelect(expert.slug)}
                  className="gap-2.5"
                >
                  <span className="text-base leading-none">{expert.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{expert.name}</div>
                    <div className="text-muted-foreground line-clamp-1 text-xs">
                      {expert.description}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
