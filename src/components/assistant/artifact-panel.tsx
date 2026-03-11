"use client"

import { useCallback, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { X, Eye, Pencil, Copy, Download, Check, FileText, Printer, Code } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageResponse } from "@/components/ai-elements/message"
import type { ArtifactContentType } from "@/types/artifact"
import { HtmlPreview } from "./html-preview"

const ArtifactEditor = dynamic(
  () =>
    import("./artifact-editor").then((mod) => ({
      default: mod.ArtifactEditor,
    })),
  { ssr: false }
)

interface ArtifactPanelProps {
  content: string
  title: string
  contentType: ArtifactContentType
  isStreaming: boolean
  onClose: () => void
}

function sanitizeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "dokument"
  )
}

export function ArtifactPanel({ content, title, contentType, isStreaming, onClose }: ArtifactPanelProps) {
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [editContent, setEditContent] = useState(content)
  const [copied, setCopied] = useState(false)
  const viewRef = useRef<HTMLDivElement>(null)

  const handleCopy = useCallback(async () => {
    const textToCopy = mode === "edit" ? editContent : content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [mode, editContent, content])

  const handleDownloadFile = useCallback(() => {
    const textToDownload = mode === "edit" ? editContent : content
    const isHtml = contentType === "html"
    const blob = new Blob([textToDownload], {
      type: isHtml ? "text/html" : "text/markdown",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${sanitizeFilename(title)}.${isHtml ? "html" : "md"}`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }, [mode, editContent, content, title, contentType])

  const handleDownloadPdf = useCallback(() => {
    if (contentType === "html") {
      // For HTML content, print the HTML directly
      const htmlToPrint = mode === "edit" ? editContent : content
      const iframe = document.createElement("iframe")
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals")
      iframe.style.position = "fixed"
      iframe.style.left = "-9999px"
      iframe.style.top = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      document.body.appendChild(iframe)

      const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document
      if (!iframeDoc) {
        iframe.remove()
        return
      }

      iframeDoc.open()
      iframeDoc.write(htmlToPrint)
      iframeDoc.close()

      iframe.onload = () => {
        iframe.contentWindow?.print()
        setTimeout(() => iframe.remove(), 1000)
      }

      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.contentWindow?.print()
          setTimeout(() => iframe.remove(), 1000)
        }
      }, 250)
      return
    }

    // For markdown content, render as styled HTML for print
    let htmlContent: string
    if (viewRef.current) {
      htmlContent = viewRef.current.innerHTML
    } else {
      const escaped = (mode === "edit" ? editContent : content)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      htmlContent = `<pre style="white-space: pre-wrap;">${escaped}</pre>`
    }

    const printDoc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body {
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    line-height: 1.65;
    color: #1a1a1a;
    max-width: 100%;
  }
  h1, h2, h3, h4, h5, h6 { font-weight: bold; margin: 1em 0 0.5em; page-break-after: avoid; }
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3em; }
  h3 { font-size: 1.1em; }
  p { margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  li { margin: 0.25em 0; }
  code { background: #f5f5f5; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.85em; font-family: "Cascadia Code", "Fira Code", Consolas, monospace; }
  pre { background: #f5f5f5; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; page-break-inside: avoid; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 1em 0; page-break-inside: avoid; }
  th, td { border: 1px solid #d4d4d4; padding: 0.5em 0.75em; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  blockquote { border-left: 3px solid #d4d4d4; padding-left: 1em; margin: 1em 0; color: #555; }
  a { color: #2563eb; text-decoration: underline; }
  hr { border: none; border-top: 1px solid #d4d4d4; margin: 1.5em 0; }
  img { max-width: 100%; }
</style>
</head><body>${htmlContent}</body></html>`

    const iframe = document.createElement("iframe")
      iframe.setAttribute("sandbox", "allow-same-origin allow-modals")
    iframe.style.position = "fixed"
    iframe.style.left = "-9999px"
    iframe.style.top = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document
    if (!iframeDoc) {
      iframe.remove()
      return
    }

    iframeDoc.open()
    iframeDoc.write(printDoc)
    iframeDoc.close()

    iframe.onload = () => {
      iframe.contentWindow?.print()
      setTimeout(() => iframe.remove(), 1000)
    }

    setTimeout(() => {
      if (iframe.parentNode) {
        iframe.contentWindow?.print()
        setTimeout(() => iframe.remove(), 1000)
      }
    }, 250)
  }, [mode, editContent, content, title, contentType])

  const handleToggleMode = useCallback(() => {
    if (mode === "view") {
      setEditContent(content)
      setMode("edit")
    } else {
      setMode("view")
    }
  }, [mode, content])

  const isHtml = contentType === "html"

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          {isStreaming && (
            <span className="bg-primary size-2 shrink-0 animate-pulse rounded-full" />
          )}
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleToggleMode}
            title={mode === "view" ? "Bearbeiten" : "Vorschau"}
          >
            {mode === "view" ? (
              <Pencil className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleCopy}
            title="Kopieren"
          >
            {copied ? (
              <Check className="size-3.5" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                title="Herunterladen"
              >
                <Download className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownloadFile}>
                {isHtml ? (
                  <Code className="size-3.5" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                {isHtml ? "HTML (.html)" : "Markdown (.md)"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPdf}>
                <Printer className="size-3.5" />
                Als PDF drucken
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onClose}
          >
            <X className="size-3.5" />
            <span className="sr-only">Schliessen</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === "view" ? (
          isHtml ? (
            <HtmlPreview html={content} />
          ) : (
            <div ref={viewRef} className="p-6">
              <MessageResponse className="chat-prose">
                {content}
              </MessageResponse>
            </div>
          )
        ) : (
          <ArtifactEditor
            value={editContent}
            onChange={setEditContent}
            language={isHtml ? "html" : "markdown"}
          />
        )}
      </div>
    </div>
  )
}
