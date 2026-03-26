/**
 * generate_design tool — generates production-quality UI designs using Google Stitch.
 *
 * Uses callTool directly to capture and log the raw MCP response,
 * then extracts screen data flexibly from whatever shape Stitch returns.
 */

import { tool } from "ai"
import { z } from "zod"
import { stitch } from "@google/stitch-sdk"
import { createArtifact } from "@/lib/db/queries/artifacts"

/** Stitch metadata stored on artifacts for iteration support */
export interface StitchMetadata {
  stitchProjectId: string
  stitchScreenId: string
}

/**
 * Deep-search an object for a key, returning the first match.
 */
function deepFind(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined
  const record = obj as Record<string, unknown>
  if (key in record) return record[key]
  for (const v of Object.values(record)) {
    const found = deepFind(v, key)
    if (found !== undefined) return found
  }
  return undefined
}

/**
 * Factory: creates a generate_design tool scoped to a chat + user.
 */
export function generateDesignTool(chatId: string, userId: string) {
  return tool({
    description:
      "Generate a production-quality UI design from a text description using Google Stitch. " +
      "Use this for landing pages, dashboards, app screens, settings pages, and any visual UI design. " +
      "Stitch produces high-quality HTML with Tailwind CSS — much better than writing HTML manually. " +
      "For simple code snippets or non-visual content, use create_artifact instead. " +
      "Write prompts in English for best results. Be specific about layout, sections, and content.",
    inputSchema: z.object({
      prompt: z.string().min(3).max(8000).describe(
        "Detailed description of the UI design to generate. Include layout structure, sections, content, and style preferences. Write in English. Be as detailed as possible — Stitch produces better results with specific descriptions."
      ),
      title: z.string().max(200).describe("Short title for the generated design"),
      style: z.string().max(200).optional().describe(
        "Style hint, e.g. 'dark mode SaaS dashboard', 'minimal portfolio', 'colorful landing page'"
      ),
      colorScheme: z.string().max(200).optional().describe(
        "Color scheme, e.g. 'blue and white', 'dark with purple accents', 'warm earth tones'"
      ),
      deviceType: z.enum(["DESKTOP", "MOBILE", "TABLET"]).optional().describe(
        "Target device type. Defaults to DESKTOP."
      ),
    }),
    execute: async ({ prompt, title, style, colorScheme, deviceType }) => {
      // 1. Enrich prompt
      let enrichedPrompt = prompt
      if (style) enrichedPrompt += `\nStyle: ${style}`
      if (colorScheme) enrichedPrompt += `\nColor scheme: ${colorScheme}`

      // 2. Create project
      const project = await stitch.createProject(title)
      const projectId = project.id
      console.log("[generate_design] Project created:", projectId)

      // 3. Generate screen via callTool to capture raw response
      const raw = await stitch.callTool("generate_screen_from_text", {
        projectId,
        prompt: enrichedPrompt,
        deviceType: deviceType ?? "DESKTOP",
        modelId: "GEMINI_3_FLASH",
      })

      console.log("[generate_design] Raw response keys:", Object.keys(raw as object))

      // 4. Extract screen ID — search flexibly through response
      let screenId: string | null = null
      let htmlUrl: string | null = null

      // Try to find screenId and downloadUrl anywhere in the response
      const downloadUrl = deepFind(raw, "downloadUrl")
      if (typeof downloadUrl === "string") htmlUrl = downloadUrl

      // Look for screen ID in various locations
      const foundId = deepFind(raw, "screenId") ?? deepFind(raw, "id")
      if (typeof foundId === "string") screenId = foundId

      // Try name pattern: "projects/xxx/screens/yyy"
      if (!screenId) {
        const name = deepFind(raw, "name")
        if (typeof name === "string" && name.includes("/screens/")) {
          screenId = name.split("/screens/")[1]
        }
      }

      console.log("[generate_design] Extracted screenId:", screenId, "htmlUrl:", htmlUrl ? "found" : "not found")

      // 5. If no HTML URL from generate response, fetch via get_screen
      if (!htmlUrl && screenId) {
        console.log("[generate_design] Fetching HTML via get_screen...")
        const screenRaw = await stitch.callTool("get_screen", {
          projectId,
          screenId,
          name: `projects/${projectId}/screens/${screenId}`,
        }) as Record<string, unknown>
        const foundUrl = deepFind(screenRaw, "downloadUrl")
        if (typeof foundUrl === "string") htmlUrl = foundUrl
      }

      // 6. Last resort: list screens and fetch HTML individually
      if (!htmlUrl && screenId) {
        console.log("[generate_design] Fetching HTML via get_screen for", screenId)
        const screenRaw = await stitch.callTool("get_screen", {
          projectId, screenId,
          name: `projects/${projectId}/screens/${screenId}`,
        }) as Record<string, unknown>
        const foundUrl = deepFind(screenRaw, "downloadUrl")
        if (typeof foundUrl === "string") htmlUrl = foundUrl
      }

      if (!screenId || !htmlUrl) {
        throw new Error(
          `Design-Generierung fehlgeschlagen: screenId=${screenId ?? "null"}, htmlUrl=${htmlUrl ? "found" : "null"}. ` +
          `Bitte Server-Logs pruefen.`
        )
      }

      // 7. Download HTML
      console.log("[generate_design] Downloading HTML...")
      const htmlResponse = await fetch(htmlUrl, { signal: AbortSignal.timeout(30000) })
      if (!htmlResponse.ok) {
        throw new Error(`Failed to download Stitch HTML: ${htmlResponse.status}`)
      }
      let htmlContent = await htmlResponse.text()

      // 8. Persist
      const metadata: StitchMetadata = { stitchProjectId: projectId, stitchScreenId: screenId }
      const artifact = await createArtifact({
        chatId,
        type: "html",
        title,
        content: htmlContent,
        metadata: { ...metadata },
      })

      // 10. Credits
      const { deductToolCredits, calculateStitchGenerationCredits } = await import("@/lib/credits")
      const creditError = await deductToolCredits(userId, calculateStitchGenerationCredits(), {
        chatId, description: "Design-Generierung (Stitch)", toolName: "generate_design",
      })
      if (creditError) {
        console.warn("[generate_design] Credits insufficient:", creditError)
      }

      return {
        artifactId: artifact.id,
        title,
        type: "html" as const,
        version: 1,
      }
    },
  })
}
