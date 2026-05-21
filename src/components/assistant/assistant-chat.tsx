"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Plus, BrainCircuit, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputButton,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import type { ExpertConfig } from "@/lib/assistant/types"
import type { OutputFormat, ArtifactContentType } from "@/types/artifact"
import { assistantConfig } from "@/config/assistants"
import { ExpertPicker } from "./expert-picker"
import { FormatPicker } from "./format-picker"
import { ArtifactPanel } from "./artifact-panel"
import {
  extractArtifactTitle,
  extractHtmlTitle,
  extractCodeExecutionFileId,
  fetchCodeExecutionFile,
} from "./artifact-utils"
import { AssistantMessages } from "./assistant-messages"
import { AssistantSuggestions } from "./assistant-suggestions"
import { UploadButton, AttachmentPreviews } from "./assistant-input-helpers"

const MAX_MESSAGES_PER_SESSION = 50
const DESKTOP_BREAKPOINT = 1024

interface ArtifactState {
  messageId: string
  title: string
  content: string
  contentType: ArtifactContentType
  isOpen: boolean
}

interface AssistantChatProps {
  experts: ExpertConfig[]
  availableFormats: OutputFormat[]
}

export function AssistantChat({ experts, availableFormats }: AssistantChatProps) {
  const [expertSlug, setExpertSlug] = useState<string>(
    assistantConfig.defaultExpert
  )
  const [input, setInput] = useState("")
  const [messageCount, setMessageCount] = useState(0)
  const [artifact, setArtifact] = useState<ArtifactState | null>(null)

  const [selectedFormat, setSelectedFormat] = useState<string | null>(null)
  const [thinkingMode, setThinkingMode] = useState(false)

  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    check()
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    mql.addEventListener("change", check)
    return () => mql.removeEventListener("change", check)
  }, [])

  // Per-turn tracking: index = turn number
  const [turnExperts, setTurnExperts] = useState<string[]>([])
  const [turnFormats, setTurnFormats] = useState<(string | null)[]>([])
  const [turnThinking, setTurnThinking] = useState<boolean[]>([])

  const currentExpert = experts.find((e) => e.slug === expertSlug) ?? experts[0]
  const isNonDefault = expertSlug !== assistantConfig.defaultExpert

  // Stable map for quick expert lookup by slug
  const expertsMap = useMemo(() => {
    const map = new Map<string, ExpertConfig>()
    for (const e of experts) map.set(e.slug, e)
    return map
  }, [experts])

  // Stable map for quick format lookup by id
  const formatsMap = useMemo(() => {
    const map = new Map<string, OutputFormat>()
    for (const f of availableFormats) map.set(f.id, f)
    return map
  }, [availableFormats])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistant/chat",
      }),
    []
  )

  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    id: "assistant",
  })

  const handleExpertChange = useCallback((slug: string) => {
    setExpertSlug(slug)
  }, [])

  const handleResetExpert = useCallback(() => {
    setExpertSlug(assistantConfig.defaultExpert)
  }, [])

  const handleNewChat = useCallback(() => {
    setMessages([])
    setMessageCount(0)
    setInput("")
    setArtifact(null)
    setTurnExperts([])
    setTurnFormats([])
    setTurnThinking([])
    setSelectedFormat(null)
    setThinkingMode(false)
    setExpertSlug(assistantConfig.defaultExpert)
  }, [setMessages])

  // Refs to capture values at the moment of sending
  const expertSlugRef = useRef(expertSlug)
  expertSlugRef.current = expertSlug

  const selectedFormatRef = useRef(selectedFormat)
  selectedFormatRef.current = selectedFormat

  const thinkingModeRef = useRef(thinkingMode)
  thinkingModeRef.current = thinkingMode

  const handleSuggestionSelect = useCallback(
    (text: string) => {
      const slug = expertSlugRef.current
      const format = selectedFormatRef.current
      const thinking = thinkingModeRef.current
      setMessageCount((prev) => prev + 1)
      setTurnExperts((prev) => [...prev, slug])
      setTurnFormats((prev) => [...prev, format])
      setTurnThinking((prev) => [...prev, thinking])
      sendMessage(
        { text },
        { body: { expertSlug: slug, thinking, format: format ?? undefined } }
      )
      // Auto-reset skill-based formats (one-shot)
      if (format) {
        const fc = availableFormats.find((f) => f.id === format)
        if (fc?.skillId) setSelectedFormat(null)
      }
    },
    [sendMessage, availableFormats]
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = message.text.trim().length > 0
      const hasFiles = message.files.length > 0
      if ((hasText || hasFiles) && messageCount < MAX_MESSAGES_PER_SESSION) {
        const slug = expertSlugRef.current
        const format = selectedFormatRef.current
        const thinking = thinkingModeRef.current
        setMessageCount((prev) => prev + 1)
        setTurnExperts((prev) => [...prev, slug])
        setTurnFormats((prev) => [...prev, format])
        setTurnThinking((prev) => [...prev, thinking])
        sendMessage(
          { text: message.text, files: message.files },
          { body: { expertSlug: slug, thinking, format: format ?? undefined } }
        )
        setInput("")
        // Auto-reset skill-based formats (one-shot), keep non-skill formats sticky
        if (format) {
          const fc = availableFormats.find((f) => f.id === format)
          if (fc?.skillId) setSelectedFormat(null)
        }
      }
    },
    [messageCount, sendMessage, availableFormats]
  )

  const handleOpenArtifact = useCallback(
    (messageId: string, content: string, contentType: ArtifactContentType = "markdown") => {
      const title = contentType === "html"
        ? extractHtmlTitle(content)
        : extractArtifactTitle(content)
      setArtifact({
        messageId,
        title,
        content,
        contentType,
        isOpen: true,
      })
    },
    []
  )

  const handleCloseArtifact = useCallback(() => {
    setArtifact((prev) => (prev ? { ...prev, isOpen: false } : null))
  }, [])

  // Auto-open artifact panel for markdown formats
  useEffect(() => {
    if (status !== "streaming") return
    const lastTurnFormat = turnFormats[turnFormats.length - 1]
    if (!lastTurnFormat) return
    const formatConfig = formatsMap.get(lastTurnFormat)
    if (!formatConfig || formatConfig.contentType !== "markdown") return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== "assistant") return

    const textContent =
      lastMsg.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") ?? ""
    if (!textContent) return

    if (!artifact || artifact.messageId !== lastMsg.id) {
      setArtifact({
        messageId: lastMsg.id,
        title: extractArtifactTitle(textContent),
        content: textContent,
        contentType: "markdown",
        isOpen: true,
      })
    }
  }, [status, messages, turnFormats, formatsMap, artifact])

  // Track which message IDs we've already fetched files for
  const fetchedFileIdsRef = useRef(new Set<string>())

  // Auto-open artifact panel for html formats (code execution file output)
  useEffect(() => {
    const lastTurnFormat = turnFormats[turnFormats.length - 1]
    if (!lastTurnFormat) return
    const formatConfig = formatsMap.get(lastTurnFormat)
    if (!formatConfig || formatConfig.contentType !== "html") return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== "assistant") return

    // Already opened for this message
    if (artifact?.messageId === lastMsg.id && artifact?.contentType === "html") return

    // Extract file_id from code execution tool results
    const fileId = extractCodeExecutionFileId(lastMsg.parts)
    if (!fileId) return

    // Don't fetch twice for the same message
    if (fetchedFileIdsRef.current.has(lastMsg.id)) return
    fetchedFileIdsRef.current.add(lastMsg.id)

    // Fetch file content from Anthropic Files API
    fetchCodeExecutionFile(fileId).then((htmlContent) => {
      if (!htmlContent) return
      setArtifact({
        messageId: lastMsg.id,
        title: extractHtmlTitle(htmlContent),
        content: htmlContent,
        contentType: "html",
        isOpen: true,
      })
    })
  }, [messages, turnFormats, formatsMap, artifact])

  // Sync artifact content while panel is open (during and after streaming)
  useEffect(() => {
    if (!artifact?.isOpen) return
    const msg = messages.find((m) => m.id === artifact.messageId)
    if (!msg) return

    // HTML artifacts are fetched once via Files API, no streaming sync needed
    if (artifact.contentType === "html") return

    // For markdown artifacts, sync from text parts
    const textContent =
      msg.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("") ?? ""

    if (textContent && textContent !== artifact.content) {
      setArtifact((prev) =>
        prev
          ? {
              ...prev,
              title: extractArtifactTitle(textContent),
              content: textContent,
            }
          : null
      )
    }
  }, [messages, artifact])

  const isLimitReached = messageCount >= MAX_MESSAGES_PER_SESSION

  return (
    <div
      className={cn(
        "grid h-full w-full transition-[grid-template-columns] duration-300 ease-in-out",
        isDesktop && artifact?.isOpen ? "grid-cols-2" : "grid-cols-1"
      )}
    >
      {/* Chat-Bereich */}
      <div className="flex min-w-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentExpert?.emoji}</span>
            <span className="text-sm font-semibold">
              {currentExpert?.name}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Neuer Chat
          </Button>
        </div>

        {/* Messages */}
        <Conversation className="flex-1">
          <ConversationContent
            className={cn(
              "mx-auto w-full gap-6 p-6",
              isDesktop && artifact?.isOpen ? "max-w-none px-8" : "max-w-3xl"
            )}
          >
            {messages.length === 0 && currentExpert ? (
              <div className="flex flex-1 flex-col">
                <div className="flex-1" />
                <AssistantSuggestions
                  expert={currentExpert}
                  onSelect={handleSuggestionSelect}
                />
              </div>
            ) : (
              <AssistantMessages
                messages={messages}
                turnExperts={turnExperts}
                turnFormats={turnFormats}
                turnThinking={turnThinking}
                expertsMap={expertsMap}
                formatsMap={formatsMap}
                currentExpert={currentExpert}
                status={status}
                activeArtifactMessageId={artifact?.isOpen ? artifact.messageId : null}
                onOpenArtifact={handleOpenArtifact}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* Input */}
        <div className={cn(
          "mx-auto w-full pb-6",
          isDesktop && artifact?.isOpen ? "max-w-none px-8" : "max-w-3xl px-6"
        )}>
          {isLimitReached ? (
            <div className="rounded-lg border p-3">
              <p className="text-muted-foreground text-center text-sm">
                Du hast das Limit fuer diese Sitzung erreicht.
              </p>
            </div>
          ) : (
            <PromptInput
              onSubmit={handleSubmit}
              accept={assistantConfig.upload.accept}
              multiple
              maxFiles={assistantConfig.upload.maxFiles}
              maxFileSize={assistantConfig.upload.maxFileSize}
              className="rounded-lg border shadow-sm"
            >
              <AttachmentPreviews />
              {isNonDefault && currentExpert && (
                <PromptInputHeader>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 border-primary/20 bg-primary/10 text-primary pl-2 pr-1"
                  >
                    <span>{currentExpert.emoji}</span>
                    <span>@{currentExpert.name}</span>
                    <button
                      type="button"
                      aria-label="Expert zurücksetzen"
                      className="hover:bg-primary/20 ml-0.5 rounded-full p-0.5 transition-colors"
                      onClick={handleResetExpert}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                </PromptInputHeader>
              )}
              <PromptInputTextarea
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                placeholder="Nachricht an den Assistenten..."
                maxLength={2000}
              />
              <PromptInputFooter>
                <div className="flex items-center gap-1">
                  <UploadButton />
                  <PromptInputButton
                    tooltip={thinkingMode ? "Thinking deaktivieren" : "Thinking aktivieren"}
                    onClick={() => setThinkingMode((prev) => !prev)}
                    className={thinkingMode ? "bg-primary/10 text-primary" : ""}
                  >
                    <BrainCircuit className="size-4" />
                  </PromptInputButton>
                  <ExpertPicker
                    experts={experts}
                    onSelect={handleExpertChange}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <FormatPicker
                    selectedFormat={selectedFormat}
                    onSelect={setSelectedFormat}
                    formats={availableFormats}
                  />
                  <PromptInputSubmit
                    status={status}
                    onStop={stop}
                    disabled={!input.trim() || isLimitReached}
                  />
                </div>
              </PromptInputFooter>
            </PromptInput>
          )}
        </div>
      </div>

      {/* Artifact-Panel: Desktop inline im Grid */}
      {isDesktop && artifact?.isOpen && (
        <div className="overflow-hidden border-l">
          <ArtifactPanel
            content={artifact.content}
            title={artifact.title}
            contentType={artifact.contentType}
            isStreaming={
              status === "streaming" &&
              artifact.messageId === messages[messages.length - 1]?.id
            }
            onClose={handleCloseArtifact}
          />
        </div>
      )}

      {/* Artifact-Panel: Mobile/Tablet als Sheet-Overlay */}
      {!isDesktop && artifact !== null && (
        <Sheet open={artifact.isOpen} onOpenChange={(open) => !open && handleCloseArtifact()}>
          <SheetContent side="right" showCloseButton={false} className="w-[85vw] max-w-[480px] p-0 sm:max-w-none">
            <SheetTitle className="sr-only">{artifact.title}</SheetTitle>
            <ArtifactPanel
              content={artifact.content}
              title={artifact.title}
              contentType={artifact.contentType}
              isStreaming={
                status === "streaming" &&
                artifact.messageId === messages[messages.length - 1]?.id
              }
              onClose={handleCloseArtifact}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
