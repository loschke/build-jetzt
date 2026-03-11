import fs from "fs/promises"
import path from "path"

const SLUG_PATTERN = /^[a-z0-9-]+$/

export async function loadAssistantPrompt(
  expertSlug: string
): Promise<string> {
  if (!SLUG_PATTERN.test(expertSlug)) {
    throw new Error("Invalid expert slug")
  }

  const basePath = path.join(
    process.cwd(),
    "src/content/assistants",
    expertSlug
  )

  // System-Prompt (immer vorhanden)
  const systemContent = await fs.readFile(
    path.join(basePath, "system.md"),
    "utf-8"
  )

  // Knowledge-Dateien lesen
  const knowledgePath = path.join(basePath, "knowledge")
  let knowledgeBlocks: string[] = []

  try {
    const files = await fs.readdir(knowledgePath)
    const mdFiles = files.filter((f) => f.endsWith(".md")).sort()

    const contents = await Promise.all(
      mdFiles.map(async (file) => {
        const content = await fs.readFile(
          path.join(knowledgePath, file),
          "utf-8"
        )
        const label = file.replace(/\.md$/, "")
        return `### ${label}\n\n${content}`
      })
    )

    knowledgeBlocks = contents.filter(Boolean)
  } catch {
    // Kein knowledge-Ordner — nur system.md
  }

  if (knowledgeBlocks.length === 0) {
    return systemContent
  }

  return [
    systemContent,
    "---\n\n## Kontext-Wissen\n",
    ...knowledgeBlocks,
  ].join("\n\n")
}
