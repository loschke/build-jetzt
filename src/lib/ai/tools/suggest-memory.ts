import { tool } from "ai"
import { z } from "zod"
import type { ToolRegistration } from "./registry"

/**
 * suggest_memory tool — presents memory suggestions to the user for approval.
 * No `execute` function: the stream pauses, the client renders the suggestion widget,
 * and the user's choices are sent back via `addToolResult`.
 */
export const suggestMemoryTool = tool({
  description:
    "Schlage dem Nutzer Erinnerungen zum Speichern vor. " +
    "Nutze dieses Tool wenn du aus dem Gesprächsverlauf wichtige Informationen identifiziert hast " +
    "die für zukünftige Chats relevant wären (Präferenzen, Workflows, Projekt-Kontext). " +
    "Der Nutzer entscheidet selbst welche Vorschläge gespeichert werden.",
  inputSchema: z.object({
    suggestions: z
      .array(
        z.object({
          memory: z
            .string()
            .min(3)
            .max(500)
            .describe("Die zu merkende Information, klar und präzise formuliert"),
          reason: z
            .string()
            .max(200)
            .describe("Kurzer Grund warum diese Information relevant ist"),
        })
      )
      .min(1)
      .max(5)
      .describe("Liste der Memory-Vorschläge (max 5)"),
  }),
})

export const registration: ToolRegistration = {
  name: "suggest_memory",
  label: "Erinnerungen vorschlagen",
  icon: "Brain",
  category: "memory",
  customRenderer: true,
}
