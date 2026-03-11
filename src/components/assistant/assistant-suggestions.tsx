"use client"

import type { ExpertConfig } from "@/lib/assistant/types"

interface AssistantSuggestionsProps {
  expert: ExpertConfig
  onSelect: (text: string) => void
}

export function AssistantSuggestions({
  expert,
  onSelect,
}: AssistantSuggestionsProps) {
  return (
    <div className="flex flex-col items-center gap-6 pb-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">{expert.emoji}</span>
        <h2 className="text-lg font-semibold">{expert.name}</h2>
        <p className="text-muted-foreground text-sm">{expert.description}</p>
      </div>
      {expert.suggestions.length > 0 && (
        <div className="flex max-w-md flex-col gap-2">
          {expert.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="bg-muted/50 hover:bg-muted text-foreground rounded-lg px-4 py-2.5 text-left text-sm transition-colors"
              onClick={() => onSelect(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
