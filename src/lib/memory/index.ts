import { memoryConfig } from "@/config/memory"

// --- Types ---

export interface MemoryEntry {
  id: string
  memory: string
  metadata?: Record<string, unknown>
  score?: number
  created_at?: string
  updated_at?: string
}

// --- Circuit Breaker ---

const FAILURE_THRESHOLD = 5
const COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

let failureCount = 0
let lastFailureTime = 0

function isCircuitOpen(): boolean {
  if (failureCount < FAILURE_THRESHOLD) return false
  const elapsed = Date.now() - lastFailureTime
  if (elapsed >= COOLDOWN_MS) {
    // Half-open: allow one attempt
    failureCount = 0
    return false
  }
  return true
}

function recordFailure(): void {
  failureCount++
  lastFailureTime = Date.now()
}

function recordSuccess(): void {
  failureCount = 0
}

// --- Search ---

export async function searchMemories(
  userId: string,
  query: string,
  limit?: number,
): Promise<MemoryEntry[]> {
  if (isCircuitOpen()) {
    return []
  }

  try {
    // Dynamic import — mem0ai only loaded when this function is called
    const { getMemoryClient } = await import("@/config/memory")
    const client = await getMemoryClient()

    const results = await client.search(query, {
      user_id: userId,
      limit: limit ?? memoryConfig.searchLimit,
    })

    recordSuccess()

    if (!Array.isArray(results)) return []

    return results.map((r) => ({
      id: r.id,
      memory: r.memory ?? "",
      metadata: r.metadata as Record<string, unknown> | undefined,
      score: r.score,
      created_at: r.created_at ? String(r.created_at) : undefined,
      updated_at: r.updated_at ? String(r.updated_at) : undefined,
    }))
  } catch (error) {
    recordFailure()
    console.error("[memory] Search failed:", error instanceof Error ? error.message : error)
    return []
  }
}

// --- Prompt Formatting ---

const MAX_MEMORY_CHARS = 4000

export function formatMemoriesForPrompt(memories: MemoryEntry[]): string {
  if (memories.length === 0) return ""

  const header = "## Kontext aus früheren Sessions\n\n"
  let budget = MAX_MEMORY_CHARS - header.length
  const lines: string[] = []

  for (const mem of memories) {
    const line = `- ${mem.memory}`
    if (line.length > budget) break
    lines.push(line)
    budget -= line.length + 1 // +1 for newline
  }

  if (lines.length === 0) return ""

  return header + lines.join("\n")
}
