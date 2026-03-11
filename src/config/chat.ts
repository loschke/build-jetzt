import { aiDefaults } from "./ai"

export const chatConfig = {
  ...aiDefaults,
  /** Maximale Output-Tokens pro Antwort */
  maxTokens: 1024,
  /** Welcher Guide aus src/content/guides/ geladen wird */
  guidePath: "ai-design",
  /** Name des Experten im Chat-Panel Header */
  expertName: "KI-Design Experte",
  /** Emoji des Experten im Chat-Panel Header */
  expertEmoji: "🎨",
} as const
