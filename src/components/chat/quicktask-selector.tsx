"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Image,
  Share2,
  CalendarCheck,
  Sparkles,
  User,
  type LucideIcon,
} from "lucide-react"
import type { SkillField } from "@/lib/ai/skills/discovery"

/** Public quicktask info from API */
export interface QuicktaskPublic {
  slug: string
  name: string
  description: string
  category: string | null
  icon: string | null
  fields: SkillField[]
  outputAsArtifact: boolean
  isOwned?: boolean
}

const ICON_MAP: Record<string, LucideIcon> = {
  Image,
  Share2,
  CalendarCheck,
  Sparkles,
}

/** Special filter key for user-owned quicktasks */
const FILTER_MINE = "__mine__"

interface QuicktaskSelectorProps {
  onQuicktaskSelect: (quicktask: QuicktaskPublic) => void
}

export function QuicktaskSelector({ onQuicktaskSelect }: QuicktaskSelectorProps) {
  const [quicktasks, setQuicktasks] = useState<QuicktaskPublic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/skills/quicktasks")
        if (res.ok) {
          const data = await res.json()
          setQuicktasks(data)
        }
      } catch {
        // Non-critical
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const hasOwned = useMemo(() => quicktasks.some((q) => q.isOwned), [quicktasks])

  const categories = useMemo(() => {
    const cats = new Set<string>()
    for (const q of quicktasks) {
      if (q.category) cats.add(q.category)
    }
    return Array.from(cats).sort()
  }, [quicktasks])

  const filtered = useMemo(() => {
    if (activeFilter === FILTER_MINE) {
      return quicktasks.filter((q) => q.isOwned)
    }
    if (activeFilter) {
      return quicktasks.filter((q) => q.category === activeFilter)
    }
    return quicktasks
  }, [quicktasks, activeFilter])

  if (isLoading || quicktasks.length === 0) return null

  const showFilters = categories.length > 1 || hasOwned

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {showFilters && (
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
          {hasOwned && (
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
          )}
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveFilter(cat)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                activeFilter === cat
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((qt) => {
          const Icon = ICON_MAP[qt.icon ?? ""] ?? Sparkles
          return (
            <button
              key={qt.slug}
              type="button"
              onClick={() => onQuicktaskSelect(qt)}
              className={`group flex flex-col items-start gap-2 rounded-xl border p-4 text-left text-sm card-interactive hover:border-primary/20 hover:bg-muted/40 ${
                qt.isOwned ? "border-primary/30 bg-primary/[0.03]" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`flex size-8 items-center justify-center rounded-xl ${
                  qt.isOwned
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground group-hover:text-foreground"
                }`}>
                  <Icon className="size-4" />
                </div>
                {qt.isOwned && (
                  <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <User className="size-2.5" />
                    Mein
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-medium leading-tight">{qt.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {qt.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
