"use client"

import { useEffect, useState } from "react"
import { UserX } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ExpertPublic } from "@/types/expert"
import { EXPERT_ICON_MAP, DEFAULT_EXPERT_ICON } from "@/lib/icon-map"

interface ExpertSwitchPopoverProps {
  currentExpertId: string | null
  onSelect: (expertId: string | null, expertName?: string, expertIcon?: string | null) => void
  children: React.ReactNode
}

export function ExpertSwitchPopover({ currentExpertId, onSelect, children }: ExpertSwitchPopoverProps) {
  const [open, setOpen] = useState(false)
  const [experts, setExperts] = useState<ExpertPublic[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    fetch("/api/experts")
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setExperts(data))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [open, loaded])

  function handleSelect(expert: ExpertPublic | null) {
    if (expert) {
      onSelect(expert.id, expert.name, expert.icon)
    } else {
      onSelect(null)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 p-2">
        <div className="mb-1.5 px-2 pt-1 text-xs font-medium text-muted-foreground">Experte wechseln</div>
        <div className="max-h-64 overflow-auto space-y-0.5">
          {/* No expert option */}
          <button
            type="button"
            onClick={() => handleSelect(null)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
              currentExpertId === null
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
          >
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <UserX className="size-3.5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium leading-tight">Kein Experte</div>
              <div className="text-xs text-muted-foreground truncate">Generischer Chat</div>
            </div>
          </button>

          {!loaded ? (
            <div className="flex items-center justify-center py-4">
              <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            </div>
          ) : (
            experts.map((expert) => {
              const Icon = EXPERT_ICON_MAP[expert.icon ?? ""] ?? DEFAULT_EXPERT_ICON
              const isActive = currentExpertId === expert.id
              return (
                <button
                  key={expert.id}
                  type="button"
                  onClick={() => handleSelect(expert)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                    isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium leading-tight">{expert.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{expert.description}</div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
