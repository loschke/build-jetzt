"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  GalleryHorizontalEnd,
  Code,
  ClipboardCheck,
  MessageSquareMore,
  Image as ImageIcon,
  Volume2,
  Layers,
  Loader2,
  Info,
  FlaskConical,
  LayoutGrid,
  FolderOpen,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEEP_RESEARCH_TAG } from "@/lib/ai/deep-research"

interface ArtifactItem {
  id: string
  title: string
  type: string
  language: string | null
  version: number
  chatId: string
  chatTitle: string | null
  fileUrl: string | null
  createdAt: string
  updatedAt: string
}

interface ArtifactGroup {
  chatId: string
  chatTitle: string | null
  artifactCount: number
  lastArtifactAt: string
  types: string[]
  previewFileUrl: string | null
}

const TYPE_ICON_MAP: Record<string, LucideIcon> = {
  html: GalleryHorizontalEnd,
  code: Code,
  quiz: ClipboardCheck,
  review: MessageSquareMore,
  image: ImageIcon,
  audio: Volume2,
  markdown: FileText,
}

const TYPE_LABELS: Record<string, string> = {
  markdown: "Dokument",
  html: "HTML",
  code: "Code",
  quiz: "Quiz",
  review: "Review",
  image: "Bild",
  audio: "Audio",
}

const TYPE_COLORS: Record<string, string> = {
  markdown: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  html: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  code: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  quiz: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  image: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  audio: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
}

const TYPE_PREVIEW_BG: Record<string, string> = {
  markdown: "bg-blue-500/8 dark:bg-blue-500/10",
  html: "bg-orange-500/8 dark:bg-orange-500/10",
  code: "bg-emerald-500/8 dark:bg-emerald-500/10",
  quiz: "bg-violet-500/8 dark:bg-violet-500/10",
  review: "bg-amber-500/8 dark:bg-amber-500/10",
  image: "bg-pink-500/8 dark:bg-pink-500/10",
  audio: "bg-cyan-500/8 dark:bg-cyan-500/10",
}

const FILTER_TYPES = [
  { value: null, label: "Alle", icon: null },
  { value: "research", label: "Research", icon: FlaskConical },
  { value: "markdown", label: "Dokumente", icon: null },
  { value: "html", label: "HTML", icon: null },
  { value: "code", label: "Code", icon: null },
  { value: "image", label: "Bilder", icon: null },
  { value: "audio", label: "Audio", icon: null },
  { value: "quiz", label: "Quiz", icon: null },
  { value: "review", label: "Review", icon: null },
] as const

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Gerade eben"
  if (diffMins < 60) return `Vor ${diffMins} Min.`
  if (diffHours < 24) return `Vor ${diffHours} Std.`
  if (diffDays < 7) return `Vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`
  return date.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })
}

export function ArtifactsOverview() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<"flat" | "grouped">("flat")
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([])
  const [groups, setGroups] = useState<ArtifactGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  // Detail view: when a group is selected
  const [selectedGroup, setSelectedGroup] = useState<ArtifactGroup | null>(null)
  const [detailArtifacts, setDetailArtifacts] = useState<ArtifactItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailHasMore, setDetailHasMore] = useState(false)
  const [detailOffset, setDetailOffset] = useState(0)

  // Flat view fetch
  const fetchArtifacts = useCallback(async (filter: string | null, newOffset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: "24", offset: String(newOffset) })
    if (filter === "research") {
      params.set("tag", DEEP_RESEARCH_TAG)
    } else if (filter) {
      params.set("type", filter)
    }

    try {
      const res = await fetch(`/api/artifacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setArtifacts((prev) => append ? [...prev, ...data.artifacts] : data.artifacts)
        setHasMore(data.hasMore)
      }
    } catch {
      // Silently fail
    }
  }, [])

  // Grouped view fetch
  const fetchGroups = useCallback(async (filter: string | null, newOffset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: "24", offset: String(newOffset), groupBy: "chat" })
    if (filter === "research") {
      params.set("tag", DEEP_RESEARCH_TAG)
    } else if (filter) {
      params.set("type", filter)
    }

    try {
      const res = await fetch(`/api/artifacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGroups((prev) => append ? [...prev, ...data.groups] : data.groups)
        setHasMore(data.hasMore)
      }
    } catch {
      // Silently fail
    }
  }, [])

  // Detail view fetch (artifacts for a specific chat)
  const fetchDetailArtifacts = useCallback(async (chatId: string, filter: string | null, newOffset: number, append: boolean) => {
    const params = new URLSearchParams({ limit: "24", offset: String(newOffset), chatId })
    if (filter === "research") {
      params.set("tag", DEEP_RESEARCH_TAG)
    } else if (filter) {
      params.set("type", filter)
    }

    try {
      const res = await fetch(`/api/artifacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDetailArtifacts((prev) => append ? [...prev, ...data.artifacts] : data.artifacts)
        setDetailHasMore(data.hasMore)
      }
    } catch {
      // Silently fail
    }
  }, [])

  // Main data load on filter or viewMode change
  useEffect(() => {
    if (selectedGroup) return // Don't refetch when in detail view
    setIsLoading(true)
    setOffset(0)
    if (viewMode === "grouped") {
      fetchGroups(typeFilter, 0, false).finally(() => setIsLoading(false))
    } else {
      fetchArtifacts(typeFilter, 0, false).finally(() => setIsLoading(false))
    }
  }, [typeFilter, viewMode, selectedGroup, fetchArtifacts, fetchGroups])

  const loadMore = useCallback(async () => {
    const newOffset = offset + 24
    setIsLoadingMore(true)
    setOffset(newOffset)
    if (viewMode === "grouped") {
      await fetchGroups(typeFilter, newOffset, true)
    } else {
      await fetchArtifacts(typeFilter, newOffset, true)
    }
    setIsLoadingMore(false)
  }, [offset, typeFilter, viewMode, fetchArtifacts, fetchGroups])

  const loadMoreDetail = useCallback(async () => {
    if (!selectedGroup) return
    const newOffset = detailOffset + 24
    setIsLoadingMore(true)
    setDetailOffset(newOffset)
    await fetchDetailArtifacts(selectedGroup.chatId, typeFilter, newOffset, true)
    setIsLoadingMore(false)
  }, [detailOffset, selectedGroup, typeFilter, fetchDetailArtifacts])

  const handleCardClick = useCallback((artifact: ArtifactItem) => {
    if (artifact.type === "audio") {
      router.push(`/c/${artifact.chatId}`)
    } else {
      router.push(`/c/${artifact.chatId}?artifact=${artifact.id}`)
    }
  }, [router])

  const handleGroupClick = useCallback((group: ArtifactGroup) => {
    setSelectedGroup(group)
    setDetailArtifacts([])
    setDetailOffset(0)
    setDetailLoading(true)
    fetchDetailArtifacts(group.chatId, typeFilter, 0, false).finally(() => setDetailLoading(false))
  }, [typeFilter, fetchDetailArtifacts])

  const handleBackToGroups = useCallback(() => {
    setSelectedGroup(null)
    setDetailArtifacts([])
    setDetailOffset(0)
    setDetailHasMore(false)
  }, [])

  const handleFilterChange = useCallback((filter: string | null) => {
    setTypeFilter(filter)
    // Reset detail view when filter changes
    if (selectedGroup) {
      setSelectedGroup(null)
      setDetailArtifacts([])
    }
  }, [selectedGroup])

  const handleViewModeChange = useCallback((mode: "flat" | "grouped") => {
    setViewMode(mode)
    setSelectedGroup(null)
    setDetailArtifacts([])
  }, [])

  // Determine which empty/loading/content state to show
  const isDetailView = viewMode === "grouped" && selectedGroup !== null
  const currentLoading = isDetailView ? detailLoading : isLoading
  const currentItems = isDetailView ? detailArtifacts : artifacts
  const currentHasMore = isDetailView ? detailHasMore : hasMore

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Layers className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Meine Dateien</h1>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          Dateien werden aus Datenschutz- und Datenhygiene-Gründen automatisch nach 90 Tagen gelöscht.
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Filter Row + View Toggle */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex flex-1 flex-wrap gap-2">
            {FILTER_TYPES.map((ft) => {
              const FilterIcon = ft.icon
              return (
                <Button
                  key={ft.value ?? "all"}
                  variant={typeFilter === ft.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange(ft.value)}
                  className="h-8"
                >
                  {FilterIcon && <FilterIcon className="mr-1 size-3.5" />}
                  {ft.label}
                </Button>
              )
            })}
          </div>
          {/* View Mode Toggle */}
          <div className="flex shrink-0 items-center rounded-md border">
            <button
              type="button"
              onClick={() => handleViewModeChange("flat")}
              className={`rounded-l-md p-1.5 transition-colors ${viewMode === "flat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Einzelansicht"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange("grouped")}
              className={`rounded-r-md p-1.5 transition-colors ${viewMode === "grouped" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Nach Chat gruppiert"
            >
              <FolderOpen className="size-4" />
            </button>
          </div>
        </div>

        {/* Detail View Breadcrumb */}
        {isDetailView && (
          <div className="mb-4 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToGroups} className="h-7 gap-1 px-2">
              <ArrowLeft className="size-3.5" />
              Zurück
            </Button>
            <span className="text-sm text-muted-foreground">/</span>
            <span className="text-sm font-medium line-clamp-1">{selectedGroup.chatTitle ?? "Unbenannter Chat"}</span>
            <span className="text-xs text-muted-foreground">({selectedGroup.artifactCount} Dateien)</span>
          </div>
        )}

        {/* Loading */}
        {currentLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border bg-muted">
                <div className="aspect-[4/3]" />
                <div className="p-2.5">
                  <div className="mb-1.5 h-3.5 w-3/4 rounded bg-muted-foreground/10" />
                  <div className="h-3 w-1/2 rounded bg-muted-foreground/10" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grouped View (Master) */}
        {!currentLoading && viewMode === "grouped" && !selectedGroup && (
          <>
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FolderOpen className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {typeFilter ? "Keine Chats mit diesem Dateityp gefunden." : "Noch keine Artifacts erstellt."}
                </p>
              </div>
            )}
            {groups.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {groups.map((group) => (
                    <button
                      key={group.chatId}
                      type="button"
                      onClick={() => handleGroupClick(group)}
                      className="card-interactive flex flex-col overflow-hidden rounded-lg border text-left transition-colors hover:bg-muted/50"
                    >
                      {/* Preview area */}
                      <div className="relative aspect-[3/1] w-full overflow-hidden bg-muted">
                        {group.previewFileUrl ? (
                          <img
                            src={group.previewFileUrl}
                            alt=""
                            className="size-full object-cover opacity-60"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center gap-1.5">
                            {group.types.slice(0, 4).map((t, i) => {
                              const Icon = TYPE_ICON_MAP[t] ?? FileText
                              return <Icon key={i} className="size-5 opacity-20" />
                            })}
                          </div>
                        )}
                        {/* Count badge */}
                        <span className="absolute right-2 top-2 inline-flex items-center rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                          {group.artifactCount} {group.artifactCount === 1 ? "Datei" : "Dateien"}
                        </span>
                      </div>
                      {/* Info */}
                      <div className="flex flex-col gap-1 p-3">
                        <span className="line-clamp-1 text-sm font-medium">
                          {group.chatTitle ?? "Unbenannter Chat"}
                        </span>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {group.types.map((t) => (
                              <span
                                key={t}
                                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${TYPE_COLORS[t] ?? "bg-muted text-muted-foreground"}`}
                              >
                                {TYPE_LABELS[t] ?? t}
                              </span>
                            ))}
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground/60">
                            {formatRelativeDate(group.lastArtifactAt)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {currentHasMore && (
                  <div className="mt-6 flex justify-center">
                    <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
                      {isLoadingMore ? (
                        <><Loader2 className="mr-2 size-4 animate-spin" /> Laden...</>
                      ) : (
                        "Mehr laden"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Flat View OR Detail View (same card grid) */}
        {!currentLoading && (viewMode === "flat" || isDetailView) && (
          <>
            {currentItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Layers className="mb-3 size-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {isDetailView
                    ? "Keine Dateien in diesem Chat."
                    : typeFilter === "research"
                      ? "Noch keine Deep Research Reports vorhanden."
                      : typeFilter
                        ? `Keine ${TYPE_LABELS[typeFilter] ?? typeFilter}-Artifacts vorhanden.`
                        : "Noch keine Artifacts erstellt."}
                </p>
              </div>
            )}

            {currentItems.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {currentItems.map((artifact) => {
                    const Icon = TYPE_ICON_MAP[artifact.type] ?? FileText
                    const isImage = artifact.type === "image" && artifact.fileUrl
                    return (
                      <button
                        key={artifact.id}
                        type="button"
                        onClick={() => handleCardClick(artifact)}
                        className="card-interactive flex flex-col overflow-hidden rounded-lg border text-left transition-colors hover:bg-muted/50"
                      >
                        {/* Preview area */}
                        <div className={`relative aspect-[4/3] w-full overflow-hidden ${isImage ? "bg-muted" : TYPE_PREVIEW_BG[artifact.type] ?? "bg-muted"}`}>
                          {isImage ? (
                            <img
                              src={artifact.fileUrl!}
                              alt={artifact.title}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <Icon className="size-8 opacity-30" />
                            </div>
                          )}
                          <span className={`absolute bottom-1.5 left-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium backdrop-blur-sm ${TYPE_COLORS[artifact.type] ?? "bg-muted text-muted-foreground"}`}>
                            {TYPE_LABELS[artifact.type] ?? artifact.type}
                          </span>
                        </div>
                        {/* Info */}
                        <div className="flex flex-col gap-0.5 p-2.5">
                          <span className="line-clamp-1 text-xs font-medium">{artifact.title}</span>
                          <div className="flex items-center justify-between">
                            {!isDetailView && artifact.chatTitle ? (
                              <span className="line-clamp-1 text-[11px] text-muted-foreground">{artifact.chatTitle}</span>
                            ) : (
                              <span />
                            )}
                            <span className="shrink-0 text-[11px] text-muted-foreground/60">{formatRelativeDate(artifact.createdAt)}</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {currentHasMore && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isDetailView ? loadMoreDetail : loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <><Loader2 className="mr-2 size-4 animate-spin" /> Laden...</>
                      ) : (
                        "Mehr laden"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
