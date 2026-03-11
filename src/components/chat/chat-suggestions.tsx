"use client"

import type { QuickQuestion } from "@/lib/chat/load-questions"

interface ChatSuggestionsProps {
  questions: QuickQuestion[]
  onSelect: (text: string) => void
}

export function ChatSuggestions({ questions, onSelect }: ChatSuggestionsProps) {
  if (questions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <p className="text-muted-foreground text-xs font-medium">
        Häufige Fragen
      </p>
      <div className="flex flex-col gap-1.5">
        {questions.map((question) => (
          <button
            key={question.text}
            type="button"
            className="bg-muted/50 hover:bg-muted text-foreground rounded-lg px-3 py-2 text-left text-sm transition-colors"
            onClick={() => onSelect(question.text)}
          >
            {question.text}
          </button>
        ))}
      </div>
    </div>
  )
}
