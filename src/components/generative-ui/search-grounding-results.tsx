"use client"

import { ExternalLink, Search } from "lucide-react"
import { MessageResponse } from "@/components/ai-elements/message"
import { safeDomain } from "@/lib/url-validation"

export interface GroundingSourceItem {
  url: string
  title: string
}

interface SearchGroundingResultsProps {
  query: string
  answer: string
  sources: GroundingSourceItem[]
}

/** Only allow http/https URLs for source chips */
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return /^https?:$/.test(parsed.protocol)
  } catch {
    return false
  }
}

function SourceChip({ source }: { source: GroundingSourceItem }) {
  const domain = safeDomain(source.url, "")
  if (!domain) return null

  const label = source.title || domain

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors max-w-[280px]"
      title={source.title ? `${source.title} — ${domain}` : domain}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=16`}
        alt=""
        className="size-3.5 shrink-0 rounded-sm"
        loading="lazy"
      />
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3 shrink-0 opacity-50" />
    </a>
  )
}

export function SearchGroundingResults({ query, answer, sources }: SearchGroundingResultsProps) {
  // Deduplicate by URL and filter unsafe URLs
  const uniqueSources = sources
    .filter((s, i, arr) => isSafeUrl(s.url) && arr.findIndex((x) => x.url === s.url) === i)

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Search className="size-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Google Search &middot; &bdquo;{query}&ldquo;
        </span>
      </div>

      <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
        <div className="p-4">
          <MessageResponse className="chat-prose text-sm">{answer}</MessageResponse>
        </div>

        {uniqueSources.length > 0 && (
          <div className="border-t border-border/30 px-4 py-3">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">
              Quellen ({uniqueSources.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {uniqueSources.map((source, i) => (
                <SourceChip key={`${source.url}-${i}`} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SearchGroundingResultsSkeleton() {
  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="size-3.5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-36 rounded bg-muted animate-pulse" />
      </div>
      <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
          <div className="h-4 w-4/6 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-1.5 pt-2">
          <div className="h-7 w-28 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-32 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-24 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}
