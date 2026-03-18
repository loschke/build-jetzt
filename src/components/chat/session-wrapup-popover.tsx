"use client"

import { useState } from "react"
import { FileOutput } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { WRAPUP_TYPES } from "@/config/wrapup"

interface SessionWrapupPopoverProps {
  onSubmit: (type: string, context?: string) => void
  disabled?: boolean
}

export function SessionWrapupPopover({ onSubmit, disabled }: SessionWrapupPopoverProps) {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [context, setContext] = useState("")

  function handleSubmit() {
    if (!selectedType) return
    onSubmit(selectedType, context.trim() || undefined)
    setOpen(false)
    setSelectedType(null)
    setContext("")
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setSelectedType(null)
      setContext("")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg"
              disabled={disabled}
            >
              <FileOutput className="size-4" />
              <span className="sr-only">Session abschließen</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">Session abschließen</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="start" className="w-[320px] p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium">Session abschließen</p>
          <div className="flex flex-wrap gap-1.5">
            {WRAPUP_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(t.key === selectedType ? null : t.key)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedType === t.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {selectedType && (
            <p className="text-xs text-muted-foreground">
              {WRAPUP_TYPES.find((t) => t.key === selectedType)?.description}
            </p>
          )}
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Zusätzliche Hinweise (optional)"
            rows={2}
            maxLength={1000}
            className="resize-none text-sm"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!selectedType}
            onClick={handleSubmit}
          >
            Erstellen
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
