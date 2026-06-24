"use client"

import { DownloadIcon } from "lucide-react"
import type { McpMediaBlock } from "@/lib/ai/mcp-content"

/**
 * Renders the media blocks (image/audio) extracted from an MCP tool result.
 * Used below the ToolStatus header for servers that return content directly
 * (Ebene A). Remote URLs are constrained to http(s)/data: by the extractor;
 * app-level CSP `img-src https: data:` / `media-src` apply as defense-in-depth.
 */
export function McpMediaBlocks({ blocks }: { blocks: McpMediaBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.kind === "image" ? (
          <figure key={i} className="overflow-hidden rounded-xl border widget-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- MCP returns arbitrary remote/data image URLs without known dimensions; next/image is unsuitable */}
            <img
              src={block.src}
              alt="MCP-Ergebnis"
              loading="lazy"
              className="block max-h-[480px] w-full bg-background object-contain"
            />
            <figcaption className="flex items-center justify-end border-t px-2 py-1">
              <a
                href={block.src}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <DownloadIcon className="size-3" />
                Herunterladen
              </a>
            </figcaption>
          </figure>
        ) : (
          <div key={i} className="rounded-xl border p-3 widget-card">
            <audio controls preload="metadata" src={block.src} className="w-full" />
          </div>
        )
      )}
    </div>
  )
}
