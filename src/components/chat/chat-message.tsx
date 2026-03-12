"use client"

import { memo, useCallback } from "react"
import { CopyIcon, DownloadIcon, CoinsIcon } from "lucide-react"

import {
  Message,
  MessageContent,
  MessageResponse,
  MessageToolbar,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message"
import { ArtifactCard } from "@/components/assistant/artifact-card"
import { artifactTypeToIcon } from "@/components/assistant/artifact-utils"
import { isCreateArtifactPart, extractArtifactFromToolPart } from "@/hooks/use-artifact"
import type { SelectedArtifact } from "@/hooks/use-artifact"

interface MessageMetadata {
  modelId?: string
  modelName?: string
  totalTokens?: number
}

interface ChatMessageProps {
  message: {
    id: string
    role: "user" | "system" | "assistant"
    parts?: Array<{ type: string; [key: string]: unknown }>
    metadata?: unknown
  }
  isLastMessage: boolean
  isStreaming: boolean
  selectedArtifact: SelectedArtifact | null
  onArtifactClick: (artifact: {
    title: string
    content: string
    type: string
    language?: string
    id?: string
    version?: number
  }) => void
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isLastMessage,
  isStreaming,
  selectedArtifact,
  onArtifactClick,
}: ChatMessageProps) {
  const isUser = message.role === "user"
  const meta = (message.metadata ?? undefined) as MessageMetadata | undefined
  const messageText = message.parts
    ?.filter((part): part is { type: string; text: string; [key: string]: unknown } => part.type === "text" && "text" in part)
    .map((part) => part.text)
    .join("") ?? ""

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(messageText).catch(() => {
      // Clipboard may not be available in insecure contexts
    })
  }, [messageText])

  const handleDownload = useCallback(() => {
    const blob = new Blob([messageText], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `message-${message.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [messageText, message.id])

  return (
    <Message from={message.role}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm">
          ✦
        </div>
      )}
      <MessageContent>
        {isUser ? (
          <p className="whitespace-pre-wrap">{messageText}</p>
        ) : (
          <>
            {message.parts?.map((part, i) => {
              if (part.type === "text") {
                return (
                  <MessageResponse
                    key={`${message.id}-text-${i}`}
                    className="chat-prose"
                    isAnimating={isStreaming && isLastMessage}
                  >
                    {"text" in part ? String(part.text) : ""}
                  </MessageResponse>
                )
              }
              if (isCreateArtifactPart(part)) {
                const extracted = extractArtifactFromToolPart(part)
                if (!extracted) return null
                const { artifact } = extracted

                return (
                  <ArtifactCard
                    key={`${message.id}-artifact-${i}`}
                    title={artifact.title}
                    preview={artifact.content.slice(0, 120)}
                    icon={artifactTypeToIcon(artifact.type)}
                    isActive={
                      selectedArtifact?.id === artifact.id ||
                      (selectedArtifact?.title === artifact.title && !selectedArtifact?.id && !artifact.id)
                    }
                    onClick={() => onArtifactClick({
                      id: artifact.id,
                      title: artifact.title,
                      content: artifact.content,
                      type: artifact.type,
                      language: artifact.language,
                      version: artifact.version,
                    })}
                  />
                )
              }
              return null
            })}
          </>
        )}
      </MessageContent>
      {!isUser && !(isStreaming && isLastMessage) && (
        <MessageToolbar className="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {meta?.modelName && <span>{meta.modelName}</span>}
            {meta?.totalTokens != null && (
              <span className="flex items-center gap-0.5">
                <CoinsIcon className="size-3" />
                {meta.totalTokens.toLocaleString()}
              </span>
            )}
          </div>
          <MessageActions>
            <MessageAction tooltip="Kopieren" onClick={handleCopy}>
              <CopyIcon className="size-3" />
            </MessageAction>
            <MessageAction tooltip="Als Markdown herunterladen" onClick={handleDownload}>
              <DownloadIcon className="size-3" />
            </MessageAction>
          </MessageActions>
        </MessageToolbar>
      )}
    </Message>
  )
})
