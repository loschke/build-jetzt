"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { parseFakeArtifactCall } from "@/lib/ai/tools/parse-fake-artifact"
import { unwrapToolOutput } from "@/lib/ai/tool-output"
import { safeDomain } from "@/lib/url-validation"
import type { ArtifactContentType } from "@/types/artifact"

export interface SelectedArtifact {
  id?: string
  title: string
  content: string
  type: ArtifactContentType
  language?: string
  version: number
  isStreaming: boolean
  reviewMode?: boolean
}

interface ArtifactInput {
  type?: string
  title?: string
  content?: string
  language?: string
}

interface ArtifactOutput {
  artifactId?: string
  title?: string
  type?: string
  version?: number
}

interface ArtifactToolPart {
  type: "tool-create_artifact"
  toolCallId: string
  state: string
  input?: unknown
  output?: unknown
}

interface MessageLike {
  id: string
  role: string
  parts?: Array<{ type: string; [key: string]: unknown }>
}

/**
 * Check if a message part is a create_artifact tool invocation.
 * AI SDK 6 sends tool parts as type: "tool-{toolName}" (e.g. "tool-create_artifact").
 */
export function isCreateArtifactPart(part: { type: string }): boolean {
  return part.type === "tool-create_artifact"
}

/**
 * Check if a message part is a create_quiz tool invocation.
 */
export function isCreateQuizPart(part: { type: string }): boolean {
  return part.type === "tool-create_quiz"
}

/**
 * Check if a message part is a create_review tool invocation.
 */
export function isCreateReviewPart(part: { type: string }): boolean {
  return part.type === "tool-create_review"
}

/**
 * Check if a message part is a generate_image tool invocation.
 */
export function isGenerateImagePart(part: { type: string }): boolean {
  return part.type === "tool-generate_image"
}

/**
 * Check if a message part is a youtube_search tool invocation.
 */
export function isYouTubeSearchPart(part: { type: string }): boolean {
  return part.type === "tool-youtube_search"
}

/**
 * Check if a message part is a youtube_analyze tool invocation.
 */
export function isYouTubeAnalyzePart(part: { type: string }): boolean {
  return part.type === "tool-youtube_analyze"
}

/**
 * Check if a message part is a text_to_speech tool invocation.
 */
export function isTextToSpeechPart(part: { type: string }): boolean {
  return part.type === "tool-text_to_speech"
}

export function isExtractBrandingPart(part: { type: string }): boolean {
  return part.type === "tool-extract_branding"
}

/** Artifact-producing tools — used for auto-opening the panel during streaming */
const ARTIFACT_TOOL_TYPES = new Set(["tool-create_artifact", "tool-create_quiz", "tool-create_review", "tool-generate_image", "tool-youtube_analyze", "tool-text_to_speech", "tool-extract_branding"])

/**
 * Map saved DB parts (tool-call, tool-result) to AI SDK 6 typed tool UI parts.
 * This enables artifact cards to render when reloading a chat.
 */
export function mapSavedPartsToUI(parts: unknown[]): unknown[] {
  if (!Array.isArray(parts)) return parts

  const mapped: unknown[] = []
  const toolResults = new Map<string, unknown>()

  // First pass: collect tool results by toolCallId
  for (const part of parts) {
    const p = part as Record<string, unknown>
    if (p.type === "tool-result" && typeof p.toolCallId === "string") {
      toolResults.set(p.toolCallId, p.result)
    }
  }

  // Second pass: build UI parts
  for (const part of parts) {
    const p = part as Record<string, unknown>
    if (p.type === "text") {
      mapped.push(part)
    } else if (p.type === "file") {
      mapped.push(part)
    } else if (p.type === "step-start") {
      // Preserve step boundaries — convertToModelMessages uses these to split
      // multi-step tool interactions into separate model messages
      mapped.push(part)
    } else if (p.type === "tool-call" && typeof p.toolName === "string") {
      const result = toolResults.get(p.toolCallId as string)
      // Convert to AI SDK 6 tool UI part format (type: "tool-{toolName}")
      mapped.push({
        type: `tool-${p.toolName}`,
        toolCallId: p.toolCallId,
        state: result !== undefined ? "output-available" : "input-available",
        input: p.args ?? {},
        output: result,
      })
    }
    // tool-result parts are consumed above, not added separately
  }

  return mapped
}

/**
 * Extract artifact data from a create_artifact tool part.
 * Returns null if the part doesn't have sufficient data.
 */
export function extractArtifactFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isCreateArtifactPart(part)) return null

  const toolPart = part as unknown as ArtifactToolPart
  const inp = toolPart.input as ArtifactInput | undefined

  if (!inp?.content) return null

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp.title ?? "Artifact",
        content: inp.content,
        type: (inp.type as ArtifactContentType) ?? "markdown",
        language: inp.language,
        version: 1,
      },
      isStreaming: toolPart.state === "input-streaming",
    }
  }

  if (toolPart.state === "output-available") {
    const out = toolPart.output as ArtifactOutput | undefined
    return {
      artifact: {
        id: out?.artifactId,
        title: inp.title ?? "Artifact",
        content: inp.content,
        type: (inp.type as ArtifactContentType) ?? "markdown",
        language: inp.language,
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from a create_quiz tool part.
 * Constructs a SelectedArtifact with the quiz JSON as content.
 */
export function extractQuizFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isCreateQuizPart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { title?: string; description?: string; questions?: unknown[] }
    output?: { artifactId?: string; version?: number }
  }
  const inp = toolPart.input
  if (!inp?.questions || inp.questions.length === 0) return null

  const quizJson = JSON.stringify({
    title: inp.title ?? "Quiz",
    description: inp.description,
    questions: (inp.questions as Array<Record<string, unknown>>).map((q, i) => ({ id: `q${i + 1}`, ...q })),
  })

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp.title ?? "Quiz",
        content: quizJson,
        type: "quiz",
        version: 1,
      },
      isStreaming: toolPart.state === "input-streaming",
    }
  }

  if (toolPart.state === "output-available") {
    const out = toolPart.output
    return {
      artifact: {
        id: out?.artifactId,
        title: inp.title ?? "Quiz",
        content: quizJson,
        type: "quiz",
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from a create_review tool part.
 * Review is now a MODE of markdown artifacts — content is stored as raw markdown.
 */
export function extractReviewFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isCreateReviewPart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { title?: string; content?: string }
    output?: { artifactId?: string; version?: number; reviewMode?: boolean }
  }
  const inp = toolPart.input
  if (!inp?.content) return null

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp.title ?? "Review",
        content: inp.content,
        type: "markdown",
        version: 1,
        reviewMode: true,
      },
      isStreaming: toolPart.state === "input-streaming",
    }
  }

  if (toolPart.state === "output-available") {
    const out = toolPart.output
    return {
      artifact: {
        id: out?.artifactId,
        title: inp.title ?? "Review",
        content: inp.content,
        type: "markdown",
        version: out?.version ?? 1,
        reviewMode: true,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from a generate_image tool part.
 * Unlike create_artifact, image content is NOT available during streaming —
 * the image is generated in the execute handler. During streaming, we return
 * an empty content placeholder with isStreaming: true so the panel shows a loading state.
 * At output-available, the artifactId is used to fetch content from DB.
 */
export function extractImageFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isGenerateImagePart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { title?: string; prompt?: string; aspectRatio?: string }
    output?: unknown
  }
  const inp = toolPart.input

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    // No content yet — image is being generated. Show loading placeholder.
    return {
      artifact: {
        title: inp?.title ?? "Bild wird generiert...",
        content: "", // Empty — panel shows loading skeleton
        type: "image",
        version: 1,
      },
      isStreaming: true,
    }
  }

  if (toolPart.state === "output-available") {
    const out = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(toolPart.output)
    return {
      artifact: {
        id: out?.artifactId,
        title: out?.title ?? inp?.title ?? "Generiertes Bild",
        content: "", // Will be fetched from DB via artifactId
        type: "image",
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from a text_to_speech tool part.
 * Audio content is created server-side — empty during streaming.
 */
export function extractAudioFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isTextToSpeechPart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { title?: string; text?: string }
    output?: unknown
  }
  const inp = toolPart.input

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp?.title ?? "Audio wird generiert…",
        content: "",
        type: "audio",
        version: 1,
      },
      isStreaming: true,
    }
  }

  if (toolPart.state === "output-available") {
    const out = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(toolPart.output)
    return {
      artifact: {
        id: out?.artifactId,
        title: out?.title ?? "Audio",
        content: "",
        type: "audio",
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from an extract_branding tool part.
 * Branding JSON is created server-side — empty during streaming.
 */
export function extractBrandingFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isExtractBrandingPart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { url?: string; title?: string }
    output?: unknown
  }
  const inp = toolPart.input

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    const domain = safeDomain(inp?.url)
    return {
      artifact: {
        title: inp?.title ?? `Branding: ${domain}`,
        content: "",
        type: "code",
        language: "json",
        version: 1,
      },
      isStreaming: true,
    }
  }

  if (toolPart.state === "output-available") {
    const out = unwrapToolOutput<{ artifactId?: string; domain?: string }>(toolPart.output)
    return {
      artifact: {
        id: out?.artifactId,
        title: inp?.title ?? `Branding: ${out?.domain ?? "Website"}`,
        content: "",
        type: "code",
        language: "json",
        version: 1,
      },
      isStreaming: false,
    }
  }

  return null
}

/**
 * Extract artifact data from a youtube_analyze tool part.
 * Like youtube_search, content is created server-side — empty during streaming.
 */
export function extractYouTubeAnalyzeFromToolPart(part: { type: string; [key: string]: unknown }): {
  artifact: Omit<SelectedArtifact, "isStreaming">
  isStreaming: boolean
} | null {
  if (!isYouTubeAnalyzePart(part)) return null

  const toolPart = part as unknown as {
    state: string
    input?: { title?: string; url?: string; task?: string }
    output?: unknown
  }
  const inp = toolPart.input

  if (toolPart.state === "input-streaming" || toolPart.state === "input-available") {
    return {
      artifact: {
        title: inp?.title ?? "YouTube-Analyse…",
        content: "",
        type: "markdown",
        version: 1,
      },
      isStreaming: true,
    }
  }

  if (toolPart.state === "output-available") {
    const out = unwrapToolOutput<{ artifactId?: string; title?: string; version?: number }>(toolPart.output)
    return {
      artifact: {
        id: out?.artifactId,
        title: out?.title ?? "YouTube-Analyse",
        content: "",
        type: "markdown",
        version: out?.version ?? 1,
      },
      isStreaming: false,
    }
  }

  return null
}


/**
 * Backward compatibility for old review artifacts (type: "review", JSON content).
 * Extracts markdown content from JSON wrapper and treats as markdown with reviewMode.
 */
function resolveReviewCompat(data: { id: string; title: string; content: string; type: string; language?: string; version?: number }): Omit<SelectedArtifact, "isStreaming"> {
  if (data.type === "review") {
    // Old format: JSON-wrapped review content
    try {
      const parsed = JSON.parse(data.content) as { content?: string; title?: string }
      return {
        id: data.id,
        title: data.title,
        content: parsed.content ?? data.content,
        type: "markdown",
        language: data.language ?? undefined,
        version: data.version ?? 1,
        reviewMode: true,
      }
    } catch {
      // Invalid JSON — use raw content
      return {
        id: data.id,
        title: data.title,
        content: data.content,
        type: "markdown",
        language: data.language ?? undefined,
        version: data.version ?? 1,
        reviewMode: true,
      }
    }
  }

  return {
    id: data.id,
    title: data.title,
    content: data.content,
    type: data.type as ArtifactContentType,
    language: data.language ?? undefined,
    version: data.version ?? 1,
  }
}

interface UseArtifactOptions {
  messages: MessageLike[]
  status: string
}

/**
 * Custom hook for managing artifact state: detection (real + fake tool calls),
 * selection, save, and card click handling.
 */
export function useArtifact({ messages, status }: UseArtifactOptions) {
  const [selectedArtifact, setSelectedArtifact] = useState<SelectedArtifact | null>(null)

  // Watch for artifact-producing tool parts in the latest message during streaming
  useEffect(() => {
    if (messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role !== "assistant") return

    for (const part of lastMsg.parts ?? []) {
      // Try artifact-producing tools in order
      const extracted = extractArtifactFromToolPart(part) ?? extractQuizFromToolPart(part) ?? extractReviewFromToolPart(part) ?? extractImageFromToolPart(part) ?? extractAudioFromToolPart(part) ?? extractBrandingFromToolPart(part) ?? extractYouTubeAnalyzeFromToolPart(part)
      if (extracted) {
        setSelectedArtifact((prev) => {
          // Server-side artifacts (image, youtube_search): skip auto-open on chat reload
          // (no panel open, content empty). Allow updates when panel IS open (streaming → output-available).
          const isServerSideArtifact = !extracted.artifact.content && !extracted.isStreaming
          if (isServerSideArtifact) {
            if (!prev || prev.type !== extracted.artifact.type) {
              return prev
            }
          }

          // Skip re-setting server-side artifacts that already have content loaded
          // (prevents flicker when text continues streaming after content is ready)
          if (prev && prev.content && !prev.isStreaming
            && extracted.artifact.id === prev.id) {
            return prev
          }
          return { ...extracted.artifact, isStreaming: extracted.isStreaming }
        })
      }
    }
  }, [messages])

  // Auto-fetch server-side artifact content from DB.
  // Server-side artifacts (image, youtube_search, etc.) arrive with empty content
  // (generated in the tool's execute handler). This effect fetches the actual content
  // once an artifactId is available.
  const serverFetchedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedArtifact) return
    if (selectedArtifact.isStreaming) return
    if (!selectedArtifact.id) return
    if (selectedArtifact.content) return // Already has content

    // Prevent duplicate fetches for the same artifact
    if (serverFetchedRef.current === selectedArtifact.id) return
    serverFetchedRef.current = selectedArtifact.id

    fetch(`/api/artifacts/${selectedArtifact.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.content) {
          setSelectedArtifact((prev) =>
            prev && prev.id === data.id
              ? { ...prev, content: data.content, version: data.version ?? prev.version }
              : prev
          )
        }
      })
      .catch((err) => {
        console.warn("[useArtifact] Server artifact fetch failed:", err)
        serverFetchedRef.current = null
      })
  }, [selectedArtifact?.id, selectedArtifact?.type, selectedArtifact?.isStreaming, selectedArtifact?.content])

  // Detect fake artifact tool calls in text when streaming finishes
  const prevStatusRef = useRef(status)
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === "streaming" || prevStatusRef.current === "submitted"
    prevStatusRef.current = status
    if (!wasStreaming || status !== "ready") return
    if (selectedArtifact) return // Already have an artifact open

    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role !== "assistant") return

    const hasRealToolPart = lastMsg.parts?.some((p) => ARTIFACT_TOOL_TYPES.has(p.type))
    if (hasRealToolPart) return

    const fullText = lastMsg.parts
      ?.filter((p): p is { type: string; text: string; [key: string]: unknown } => p.type === "text" && "text" in p)
      .map((p) => p.text)
      .join("") ?? ""

    const fakeArtifact = parseFakeArtifactCall(fullText)
    if (fakeArtifact) {
      setSelectedArtifact({
        title: fakeArtifact.title,
        content: fakeArtifact.content,
        type: fakeArtifact.type,
        language: fakeArtifact.language,
        version: 1,
        isStreaming: false,
      })
    }
  }, [status, messages, selectedArtifact])

  const handleArtifactCardClick = useCallback(
    (artifact: { title: string; content: string; type: string; language?: string; id?: string; version?: number; reviewMode?: boolean }) => {
      // Skip fetch if same artifact is already loaded (saves a network request on re-click)
      if (artifact.id && selectedArtifact?.id === artifact.id && !selectedArtifact?.isStreaming) {
        return
      }
      // If we have an artifactId, fetch latest from DB (content may have been edited)
      if (artifact.id) {
        fetch(`/api/artifacts/${artifact.id}`)
          .then((res) => res.ok ? res.json() : null)
          .then((data) => {
            if (data) {
              const resolved = resolveReviewCompat(data)
              setSelectedArtifact({
                ...resolved,
                isStreaming: false,
                reviewMode: artifact.reviewMode || resolved.reviewMode,
              })
            } else {
              // Fallback to tool part data
              setSelectedArtifact({
                id: artifact.id,
                title: artifact.title,
                content: artifact.content,
                type: artifact.type as ArtifactContentType,
                language: artifact.language,
                version: artifact.version ?? 1,
                isStreaming: false,
                reviewMode: artifact.reviewMode,
              })
            }
          })
          .catch(() => {
            // Fallback to tool part data on network error
            setSelectedArtifact({
              id: artifact.id,
              title: artifact.title,
              content: artifact.content,
              type: artifact.type as ArtifactContentType,
              language: artifact.language,
              version: artifact.version ?? 1,
              isStreaming: false,
              reviewMode: artifact.reviewMode,
            })
          })
      } else {
        setSelectedArtifact({
          title: artifact.title,
          content: artifact.content,
          type: artifact.type as ArtifactContentType,
          language: artifact.language,
          version: artifact.version ?? 1,
          isStreaming: false,
          reviewMode: artifact.reviewMode,
        })
      }
    },
    [selectedArtifact?.id, selectedArtifact?.isStreaming]
  )

  const handleArtifactSave = useCallback(
    async (content: string) => {
      if (!selectedArtifact?.id) return
      try {
        const res = await fetch(`/api/artifacts/${selectedArtifact.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            expectedVersion: selectedArtifact.version,
          }),
        })
        if (res.ok) {
          const updated = await res.json()
          setSelectedArtifact((prev) =>
            prev ? { ...prev, content, version: updated.version ?? prev.version + 1 } : null
          )
        } else if (res.status === 409) {
          // Version conflict — reload latest
          const conflictData = await res.json()
          console.warn("[ArtifactPanel] Version conflict. Server version:", conflictData.currentVersion)
          // Refetch the latest version
          const latest = await fetch(`/api/artifacts/${selectedArtifact.id}`)
          if (latest.ok) {
            const data = await latest.json()
            setSelectedArtifact((prev) =>
              prev ? { ...prev, content: data.content, version: data.version } : null
            )
          }
        }
      } catch (err) {
        console.warn("[ArtifactPanel] Failed to save:", err)
      }
    },
    [selectedArtifact?.id, selectedArtifact?.version]
  )

  const closeArtifact = useCallback(() => setSelectedArtifact(null), [])

  const openArtifactById = useCallback(
    (artifactId: string) => {
      fetch(`/api/artifacts/${artifactId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const resolved = resolveReviewCompat(data)
            setSelectedArtifact({
              ...resolved,
              isStreaming: false,
            })
          }
        })
        .catch(() => {
          // Silently fail — artifact may not exist
        })
    },
    []
  )

  return {
    selectedArtifact,
    handleArtifactCardClick,
    handleArtifactSave,
    closeArtifact,
    openArtifactById,
  }
}
