import { tool } from "ai"
import { z } from "zod"

import { createArtifact } from "@/lib/db/queries/artifacts"

/**
 * Factory: creates the create_artifact tool bound to a specific chatId.
 * Content is a tool argument — AI SDK streams it automatically to the client.
 */
export function createArtifactTool(chatId: string) {
  return tool({
    description:
      "Create an artifact (standalone document, HTML page, or code file) that will be displayed in a side panel. " +
      "Use this for complete, self-contained outputs that the user might want to edit, copy, or download. " +
      "Do NOT use for short snippets, explanations, or inline code examples.",
    inputSchema: z.object({
      type: z.enum(["markdown", "html", "code"]).describe(
        "Content type: 'markdown' for documents/reports, 'html' for interactive web pages, 'code' for source code files"
      ),
      title: z.string().max(200).describe("Short descriptive title for the artifact"),
      content: z.string().min(1).max(500_000).describe("The full content of the artifact"),
      language: z
        .string()
        .max(30)
        .optional()
        .describe("Programming language for code artifacts (e.g. 'python', 'typescript', 'javascript')"),
    }),
    execute: async ({ type, title, content, language }) => {
      const artifact = await createArtifact({
        chatId,
        type,
        title,
        content,
        language: type === "code" ? language : undefined,
      })

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: artifact.type,
        version: artifact.version,
      }
    },
  })
}
