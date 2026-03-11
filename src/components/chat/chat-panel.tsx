"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input"
import { chatConfig } from "@/config/chat"
import { features } from "@/config/features"
import { useModuleContext } from "@/hooks/use-module-context"
import { useChatPanel } from "./chat-provider"
import { ChatSuggestions } from "./chat-suggestions"
import type { QuickQuestion } from "@/lib/chat/load-questions"

const MAX_MESSAGES_PER_SESSION = 50
const DESKTOP_BREAKPOINT = 1024

export function ChatPanel() {
  if (!features.chat.enabled) {
    return null
  }

  return <ChatPanelInner />
}

function ChatPanelInner() {
  const { isOpen, close } = useChatPanel()
  const { moduleSlug, hasChat } = useModuleContext()
  const [isDesktop, setIsDesktop] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [questions, setQuestions] = useState<QuickQuestion[]>([])
  const [input, setInput] = useState("")

  // Desktop-Breakpoint prüfen
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT)
    check()
    const mql = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    mql.addEventListener("change", check)
    return () => mql.removeEventListener("change", check)
  }, [])

  // Quick Questions laden wenn Modul sich ändert
  useEffect(() => {
    if (!moduleSlug) {
      setQuestions([])
      return
    }

    fetch(`/api/chat/questions?module=${moduleSlug}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setQuestions)
      .catch(() => setQuestions([]))
  }, [moduleSlug])

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  )

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport,
    id: moduleSlug ?? "default",
  })

  // Chat zurücksetzen wenn Modul wechselt
  useEffect(() => {
    setMessages([])
    setMessageCount(0)
    setInput("")
  }, [moduleSlug, setMessages])

  const handleQuestionSelect = useCallback(
    (text: string) => {
      setMessageCount((prev) => prev + 1)
      sendMessage(
        { text },
        { body: { moduleSlug } }
      )
    },
    [sendMessage, moduleSlug]
  )

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (message.text.trim() && messageCount < MAX_MESSAGES_PER_SESSION) {
        setMessageCount((prev) => prev + 1)
        sendMessage(
          { text: message.text },
          { body: { moduleSlug } }
        )
        setInput("")
      }
    },
    [messageCount, sendMessage, moduleSlug]
  )

  const isLimitReached = messageCount >= MAX_MESSAGES_PER_SESSION

  if (!isOpen || !hasChat) {
    return null
  }

  const chatContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{chatConfig.expertEmoji}</span>
          <h2 className="text-sm font-semibold">{chatConfig.expertName}</h2>
        </div>
        {isDesktop && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={close}
          >
            <X className="size-4" />
            <span className="sr-only">Schließen</span>
          </Button>
        )}
      </div>

      {/* Messages */}
      <Conversation className="flex-1">
        <ConversationContent className="gap-4 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col">
              <div className="flex-1" />
              <ChatSuggestions
                questions={questions}
                onSelect={handleQuestionSelect}
              />
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <Message from={message.role} key={message.id}>
                    {!isUser && (
                      <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
                        {chatConfig.expertEmoji}
                      </div>
                    )}
                    <MessageContent>
                      {isUser ? (
                        <p className="whitespace-pre-wrap">
                          {message.parts
                            ?.filter((part) => part.type === "text")
                            .map((part) => part.text)
                            .join("")}
                        </p>
                      ) : (
                        message.parts
                          ?.filter((part) => part.type === "text")
                          .map((part, i) => (
                            <MessageResponse
                              key={`${message.id}-${i}`}
                              className="chat-prose"
                              isAnimating={
                                status === "streaming" &&
                                message.id === messages[messages.length - 1]?.id
                              }
                            >
                              {part.text}
                            </MessageResponse>
                          ))
                      )}
                    </MessageContent>
                  </Message>
                )
              })}
              {status === "submitted" &&
                messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-2">
                    <div className="bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-full text-sm">
                      {chatConfig.expertEmoji}
                    </div>
                    <div className="bg-muted flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3">
                      <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                      <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                      <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Input */}
      {isLimitReached ? (
        <div className="border-t p-3">
          <p className="text-muted-foreground text-center text-sm">
            Du hast das Limit für diese Sitzung erreicht.
          </p>
        </div>
      ) : (
        <PromptInput onSubmit={handleSubmit} className="border-t p-3">
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Deine Frage..."
            maxLength={2000}
            className="min-h-10"
          />
          <PromptInputSubmit
            status={status}
            disabled={!input.trim() || isLimitReached}
          />
        </PromptInput>
      )}
    </div>
  )

  // Desktop: Inline-Panel
  if (isDesktop) {
    return (
      <div className="w-[600px] shrink-0 border-l">
        {chatContent}
      </div>
    )
  }

  // Tablet/Mobile: Sheet
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="w-[80vw] p-0 sm:max-w-none max-[767px]:w-full"
      >
        <SheetTitle className="sr-only">{chatConfig.expertName}</SheetTitle>
        {chatContent}
      </SheetContent>
    </Sheet>
  )
}
