"use client"

import { useEffect, useState } from "react"

interface SuggestedRepliesProps {
  chatId: string
  onSelect: (text: string) => void
  disabled?: boolean
}

export function SuggestedReplies({ chatId, onSelect, disabled }: SuggestedRepliesProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [visible, setVisible] = useState(false)
  const [selected, setSelected] = useState(false)

  useEffect(() => {
    if (!chatId) return

    let cancelled = false
    let attempt = 0
    const DELAYS = [2000, 3000, 4000] // retry at 2s, 5s, 9s

    async function poll() {
      if (cancelled || attempt >= DELAYS.length) return
      try {
        // redirect:"manual" prevents the proxy's 307 (auth) from being followed
        // cross-origin, which would throw a network error and trigger pointless retries.
        const res = await fetch(`/api/chats/${chatId}/suggestions`, {
          redirect: "manual",
        })

        // Auth failure (proxy redirect, 401, 403) → abort permanently, no retry.
        // The user has to re-authenticate; further polling can't recover the state.
        if (
          res.type === "opaqueredirect" ||
          res.status === 401 ||
          res.status === 403
        ) {
          return
        }

        if (!res.ok || cancelled) return
        const data = await res.json()
        const replies = data?.suggestedReplies
        if (Array.isArray(replies) && replies.length > 0 && !cancelled) {
          setSuggestions(replies)
          requestAnimationFrame(() => {
            if (!cancelled) setVisible(true)
          })
          return
        }
      } catch {
        // Silent fail
      }
      attempt++
      if (attempt < DELAYS.length && !cancelled) {
        timer = setTimeout(poll, DELAYS[attempt])
      }
    }

    let timer = setTimeout(poll, DELAYS[0])

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [chatId])

  if (suggestions.length === 0 || selected) return null

  return (
    <div
      className={`flex flex-wrap gap-2 pl-9 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => {
            setSelected(true)
            onSelect(suggestion)
          }}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}
