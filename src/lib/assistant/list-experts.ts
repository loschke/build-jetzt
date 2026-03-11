import fs from "fs/promises"
import path from "path"

import type { ExpertConfig } from "./types"

const ASSISTANTS_DIR = path.join(process.cwd(), "src/content/assistants")

export async function listExperts(): Promise<ExpertConfig[]> {
  const entries = await fs.readdir(ASSISTANTS_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory())

  const expertPromises = dirs.map(async (dir) => {
    try {
      const configPath = path.join(ASSISTANTS_DIR, dir.name, "config.json")
      const raw = await fs.readFile(configPath, "utf-8")
      const config = JSON.parse(raw) as Omit<ExpertConfig, "slug">

      return {
        slug: dir.name,
        name: config.name,
        emoji: config.emoji,
        description: config.description,
        suggestions: config.suggestions ?? [],
      } as ExpertConfig
    } catch {
      // Ordner ohne config.json — ignorieren
      return null
    }
  })

  const results = await Promise.all(expertPromises)
  return results.filter((expert): expert is ExpertConfig => expert !== null)
}
