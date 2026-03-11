import { aiDefaults } from "./ai"

export const assistantConfig = {
  ...aiDefaults,
  /** Maximale Output-Tokens pro Antwort (hoeher als Sidebar-Chat) */
  maxTokens: 4096,
  /** Default-Experte wenn keiner gewaehlt */
  defaultExpert: "general",
  /** Ob der Assistant als Link in der Sidebar-Navigation erscheint */
  showInNavigation: true,
  /** Label fuer den Navigation-Link */
  navigationLabel: "Assistent",
  /** Zeichengrenze ab der "Als Artifact oeffnen" angeboten wird */
  artifactThreshold: 500,
  /** Token-Budget fuer Extended Thinking */
  thinkingBudget: 8000,
  /** maxOutputTokens wenn Thinking aktiv (muss > thinkingBudget sein) */
  thinkingMaxTokens: 12000,
  /** File-Upload Konfiguration */
  upload: {
    accept:
      "image/png,image/jpeg,image/webp,image/gif,application/pdf,text/markdown,text/plain",
    maxFiles: 5,
    maxFileSize: 4 * 1024 * 1024, // 4MB pro Datei
  },
} as const
