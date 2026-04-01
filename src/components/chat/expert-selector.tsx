"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, User } from "lucide-react"
import type { ExpertPublic } from "@/types/expert"
import { EXPERT_ICON_MAP, DEFAULT_EXPERT_ICON } from "@/lib/icon-map"

const FILTER_MINE = "__mine__"

interface ExpertSelectorProps {
  selectedExpertId: string | null
  onExpertSelect: (expertId: string | null, expertName?: string, expertIcon?: string | null) => void
}

export function ExpertSelector({ selectedExpertId, onExpertSelect }: ExpertSelectorProps) {
  const [experts, setExperts] = useState<ExpertPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    async function loadExperts() {
      try {
        const res = await fetch("/api/experts")
        if (res.ok) {
          const data = await res.json()
          setExperts(data)
        }
      } catch {
        // Non-critical — selector just won't show
      } finally {
        setIsLoading(false)
      }
    }
    loadExperts()
  }, [])

  const hasOwned = useMemo(() => experts.some((e) => e.isOwned), [experts])

  const filtered = useMemo(() => {
    if (activeFilter === FILTER_MINE) {
      return experts.filter((e) => e.isOwned)
    }
    return experts
  }, [experts, activeFilter])

  if (isLoading) {
    return (
      <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border bg-muted/30 card-elevated"
          />
        ))}
      </div>
    )
  }

  if (experts.length === 0) return null

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {hasOwned && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              activeFilter === null
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Alle
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter(FILTER_MINE)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              activeFilter === FILTER_MINE
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Meine
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((expert) => {
          const Icon = EXPERT_ICON_MAP[expert.icon ?? ""] ?? DEFAULT_EXPERT_ICON
          const isSelected = selectedExpertId === expert.id

          return (
            <button
              key={expert.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => isSelected ? onExpertSelect(null) : onExpertSelect(expert.id, expert.name, expert.icon)}
              className={`group relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm card-interactive ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : expert.isOwned
                    ? "border-primary/30 bg-primary/[0.03] hover:border-primary/20 hover:bg-muted/40"
                    : "hover:border-primary/20 hover:bg-muted/40"
              }`}
            >
              {isSelected && (
                <div className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary">
                  <Check className="size-3 text-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : expert.isOwned
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground group-hover:text-foreground"
                }`}>
                  <Icon className="size-4" />
                </div>
                {expert.isOwned && !isSelected && (
                  <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <User className="size-2.5" />
                    Mein
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium leading-tight">{expert.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {expert.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
