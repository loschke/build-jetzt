/**
 * Detects and parses "fake" artifact tool calls in assistant text.
 *
 * Some models (e.g. Gemini) don't support tool calling and instead output
 * JSON in their text response that mimics a tool call. This parser extracts
 * artifact data from such text so we can create proper artifacts from it.
 *
 * Supported formats:
 * 1. { "action": "create_artifact", "action_input": { title, text/content, language }, "type": "create_artifact" }
 * 2. { "type": "create_artifact", "title": "...", "content": "...", "language": "..." }
 * 3. JSON wrapped in markdown code fences (```json ... ```)
 */

export interface ParsedFakeArtifact {
  title: string
  content: string
  type: "markdown" | "html" | "code"
  language?: string
  /** The original JSON match (for removal from text) */
  rawMatch: string
  /** Text before the JSON block */
  textBefore: string
  /** Text after the JSON block */
  textAfter: string
}

/**
 * Try to parse a fake artifact tool call from assistant text.
 * Returns null if no fake artifact pattern is found.
 */
export function parseFakeArtifactCall(text: string): ParsedFakeArtifact | null {
  if (!text.includes("create_artifact")) return null

  // Try to find JSON block — either in code fences or raw
  const jsonMatch = extractJsonBlock(text)
  if (!jsonMatch) return null

  const { json, raw, startIndex, endIndex } = jsonMatch

  // Parse the JSON
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }

  // Must reference create_artifact
  if (parsed.action !== "create_artifact" && parsed.type !== "create_artifact") {
    return null
  }

  // Extract artifact data from different formats
  let title: string | undefined
  let content: string | undefined
  let language: string | undefined

  if (parsed.action_input && typeof parsed.action_input === "object") {
    // Format 1: { action: "create_artifact", action_input: { title, text/content, language } }
    const input = parsed.action_input as Record<string, unknown>
    title = asString(input.title)
    content = asString(input.text) ?? asString(input.content)
    language = asString(input.language)
  } else {
    // Format 2: { type: "create_artifact", title, content, language }
    title = asString(parsed.title)
    content = asString(parsed.content) ?? asString(parsed.text)
    language = asString(parsed.language)
  }

  if (!content) return null

  // Determine artifact type from language or content
  const artifactType = inferArtifactType(language, content)

  return {
    title: title ?? "Artifact",
    content,
    type: artifactType,
    language: artifactType === "code" ? language : undefined,
    rawMatch: raw,
    textBefore: text.slice(0, startIndex).trim(),
    textAfter: text.slice(endIndex).trim(),
  }
}

function asString(val: unknown): string | undefined {
  return typeof val === "string" && val.length > 0 ? val : undefined
}

function inferArtifactType(language?: string, content?: string): "markdown" | "html" | "code" {
  if (language) {
    const lang = language.toLowerCase()
    if (lang === "html") return "html"
    if (lang === "markdown" || lang === "md") return "markdown"
    return "code"
  }
  // Sniff content
  if (content && (content.trimStart().startsWith("<!DOCTYPE") || content.trimStart().startsWith("<html"))) {
    return "html"
  }
  return "markdown"
}

/**
 * Extract a JSON block from text. Looks for:
 * 1. ```json ... ``` fenced blocks containing create_artifact
 * 2. Raw JSON objects containing create_artifact
 */
function extractJsonBlock(text: string): { json: string; raw: string; startIndex: number; endIndex: number } | null {
  // Try fenced code block first
  const fenceMatch = text.match(/```(?:json)?\s*\n?\s*(\{[\s\S]*?"create_artifact"[\s\S]*?\})\s*\n?\s*```/)
  if (fenceMatch) {
    const fullMatch = fenceMatch[0]
    const startIndex = text.indexOf(fullMatch)
    return {
      json: fenceMatch[1],
      raw: fullMatch,
      startIndex,
      endIndex: startIndex + fullMatch.length,
    }
  }

  // Try raw JSON — find the outermost { ... } containing create_artifact
  const createIdx = text.indexOf("create_artifact")
  if (createIdx === -1) return null

  // Search backwards for opening brace
  let braceStart = -1
  for (let i = createIdx; i >= 0; i--) {
    if (text[i] === "{") {
      braceStart = i
      break
    }
  }
  if (braceStart === -1) return null

  // Find matching closing brace
  let depth = 0
  let braceEnd = -1
  for (let i = braceStart; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}") {
      depth--
      if (depth === 0) {
        braceEnd = i + 1
        break
      }
    }
  }
  if (braceEnd === -1) return null

  const json = text.slice(braceStart, braceEnd)

  // Validate it's parseable
  try {
    JSON.parse(json)
  } catch {
    return null
  }

  return {
    json,
    raw: json,
    startIndex: braceStart,
    endIndex: braceEnd,
  }
}
