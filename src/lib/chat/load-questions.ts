import fs from "fs/promises"
import path from "path"

const SLUG_PATTERN = /^[a-z0-9-]+$/

export interface QuickQuestion {
  text: string
  category: string
}

export async function loadQuestions(
  guidePath: string,
  moduleSlug: string
): Promise<QuickQuestion[]> {
  if (!SLUG_PATTERN.test(moduleSlug)) {
    return []
  }

  const filePath = path.join(
    process.cwd(),
    "src/content/guides",
    guidePath,
    "questions",
    `${moduleSlug}.json`
  )

  try {
    const content = await fs.readFile(filePath, "utf-8")
    return JSON.parse(content) as QuickQuestion[]
  } catch {
    return []
  }
}
