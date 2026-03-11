import fs from "fs/promises"
import path from "path"

const SLUG_PATTERN = /^[a-z0-9-]+$/

// In-memory cache for system prompts
const cache = new Map<string, string>()

export async function loadSystemPrompt(
  guidePath: string,
  moduleSlug?: string | null
): Promise<string> {
  const cacheKey = `${guidePath}:${moduleSlug ?? ""}`

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  const basePath = path.join(process.cwd(), "src/content/guides", guidePath)

  // Guide-Rolle + übergreifender Kontext (immer)
  const systemContent = await fs.readFile(
    path.join(basePath, "system.md"),
    "utf-8"
  )

  // Modul-Kontext (optional)
  let moduleContent = ""
  if (moduleSlug && SLUG_PATTERN.test(moduleSlug)) {
    try {
      moduleContent = await fs.readFile(
        path.join(basePath, "modules", `${moduleSlug}.md`),
        "utf-8"
      )
    } catch {
      // Modul-Datei nicht gefunden → kein Modul-Kontext
    }
  }

  const result = [systemContent, moduleContent].filter(Boolean).join("\n\n---\n\n")

  cache.set(cacheKey, result)

  return result
}
