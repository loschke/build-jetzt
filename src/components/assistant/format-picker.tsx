"use client"

import { useCallback, useState } from "react"
import {
  FileText,
  GalleryHorizontalEnd,
  type LucideIcon,
} from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { PromptInputButton } from "@/components/ai-elements/prompt-input"
import type { OutputFormat } from "@/types/artifact"

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  GalleryHorizontalEnd,
}

interface FormatPickerProps {
  selectedFormat: string | null
  onSelect: (id: string | null) => void
  formats: OutputFormat[]
}

export function FormatPicker({
  selectedFormat,
  onSelect,
  formats,
}: FormatPickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (id: string | null) => {
      onSelect(id)
      setOpen(false)
    },
    [onSelect]
  )

  // Single format: simple toggle button (backward compatible)
  if (formats.length <= 1) {
    const format = formats[0]
    if (!format) return null
    const Icon = ICON_MAP[format.icon] ?? FileText
    const isActive = selectedFormat === format.id
    return (
      <PromptInputButton
        tooltip={isActive ? `${format.label}-Modus deaktivieren` : `Als ${format.label} ausgeben`}
        onClick={() => onSelect(isActive ? null : format.id)}
        className={isActive ? "bg-primary/10 text-primary" : ""}
      >
        <Icon className="size-4" />
      </PromptInputButton>
    )
  }

  // Multiple formats: popover picker
  const activeFormat = formats.find((f) => f.id === selectedFormat)
  const ActiveIcon = activeFormat
    ? (ICON_MAP[activeFormat.icon] ?? FileText)
    : FileText

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PromptInputButton
          tooltip="Ausgabeformat waehlen"
          className={selectedFormat ? "bg-primary/10 text-primary" : ""}
        >
          <ActiveIcon className="size-4" />
        </PromptInputButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => handleSelect(null)}
                className="gap-2.5"
              >
                <span className="text-muted-foreground text-sm">Kein Format</span>
              </CommandItem>
              {formats.map((format) => {
                const Icon = ICON_MAP[format.icon] ?? FileText
                const isActive = selectedFormat === format.id
                return (
                  <CommandItem
                    key={format.id}
                    value={`${format.label} ${format.description}`}
                    onSelect={() => handleSelect(format.id)}
                    className={
                      isActive
                        ? "gap-2.5 bg-primary/10 text-primary"
                        : "gap-2.5"
                    }
                  >
                    <Icon className="size-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{format.label}</div>
                      <div className="text-muted-foreground line-clamp-1 text-xs">
                        {format.description}
                      </div>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
