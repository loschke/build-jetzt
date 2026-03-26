import { features } from "@/config/features"

/** Anthropic Files API base URL and beta header */
export const ANTHROPIC_FILES_API_BASE = "https://api.anthropic.com/v1/files"
export const ANTHROPIC_FILES_API_BETA = "files-api-2025-04-14"

interface SkillConfig {
  type: "anthropic" | "custom"
  skillId: string
  version: string
}

export interface FileRef {
  fileId: string
  fileName: string
  extension: string
}

const MAX_SEARCH_DEPTH = 20

/**
 * Extract file references from a code execution tool result.
 * Used by both persist.ts (server) and chat-message.tsx (client).
 * Depth-limited to prevent stack overflow on pathological AI output.
 */
export function extractFileRefs(output: unknown): FileRef[] {
  if (!output || typeof output !== "object") return []

  const files: FileRef[] = []
  const search = (obj: unknown, depth: number) => {
    if (!obj || typeof obj !== "object" || depth > MAX_SEARCH_DEPTH) return
    if (Array.isArray(obj)) {
      for (const item of obj) search(item, depth + 1)
      return
    }
    const rec = obj as Record<string, unknown>
    if (typeof rec.file_id === "string" && rec.file_id) {
      const fileName = (typeof rec.file_name === "string" ? rec.file_name : null)
        ?? (typeof rec.filename === "string" ? rec.filename : null)
        ?? rec.file_id
      const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() ?? "" : ""
      files.push({ fileId: rec.file_id, fileName, extension })
    }
    for (const val of Object.values(rec)) {
      if (val && typeof val === "object") search(val, depth + 1)
    }
  }
  search(output, 0)
  return files
}

/** All available Anthropic standard skill IDs */
const ALL_STANDARD_SKILL_IDS = ["pptx", "xlsx", "docx", "pdf"]

/** Check if a model ID is an Anthropic model */
export function isAnthropicModel(modelId: string): boolean {
  return modelId.startsWith("anthropic/")
}

/**
 * Build skills config for Anthropic Agent Skills.
 * Returns undefined if skills are disabled or model is not Anthropic.
 */
export function buildSkillsConfig(modelId: string): SkillConfig[] | undefined {
  if (!features.anthropicSkills.enabled) return undefined
  if (!isAnthropicModel(modelId)) return undefined

  const skills: SkillConfig[] = []

  // Standard Anthropic Skills (configurable via ENV, default: all)
  // Set ANTHROPIC_STANDARD_SKILL_IDS="" to disable, or "pptx,pdf" for a subset
  const standardEnv = process.env.ANTHROPIC_STANDARD_SKILL_IDS
  const standardIds = standardEnv === undefined
    ? ALL_STANDARD_SKILL_IDS
    : standardEnv.split(",").map((s) => s.trim()).filter(Boolean)

  for (const id of standardIds) {
    skills.push({ type: "anthropic", skillId: id, version: "latest" })
  }

  // Custom Skills from ENV
  const customIds = process.env.ANTHROPIC_CUSTOM_SKILL_IDS
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (customIds?.length) {
    for (const id of customIds) {
      skills.push({ type: "custom", skillId: id, version: "latest" })
    }
  }

  return skills
}
