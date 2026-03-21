"use client"

import { EXPERT_ICON_MAP, DEFAULT_EXPERT_ICON } from "@/lib/icon-map"

interface ExpertSwitchDividerProps {
  expertName: string
  expertIcon?: string | null
}

export function ExpertSwitchDivider({ expertName, expertIcon }: ExpertSwitchDividerProps) {
  const Icon = EXPERT_ICON_MAP[expertIcon ?? ""] ?? DEFAULT_EXPERT_ICON

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3" />
        <span>{expertName}</span>
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
