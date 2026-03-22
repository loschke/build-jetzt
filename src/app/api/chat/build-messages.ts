import { convertToModelMessages } from "ai"
import type { ModelMessage, UIMessage } from "ai"

/** Part types to keep — all others are filtered out before conversion. */
const ALLOWED_PART_TYPES = new Set(["text", "image", "file", "tool-invocation", "step-start"])

/**
 * Convert data-URL strings in file parts to Uint8Array so the AI Gateway's
 * `maybeEncodeFileParts` can re-encode them as proper data-URLs.
 */
export function fixFilePartsForGateway(messages: ModelMessage[]): ModelMessage[] {
  for (const msg of messages) {
    if (!Array.isArray(msg.content)) continue
    for (let i = 0; i < msg.content.length; i++) {
      const part = msg.content[i]
      if (
        part.type === "file" &&
        typeof part.data === "string" &&
        part.data.startsWith("data:")
      ) {
        const commaIdx = part.data.indexOf(",")
        if (commaIdx !== -1) {
          const base64 = part.data.slice(commaIdx + 1)
          msg.content[i] = { ...part, data: Buffer.from(base64, "base64") }
        }
      }
    }
  }
  return messages
}

/**
 * Add Anthropic cache control to system message for prompt caching.
 * Only applies to Anthropic models (detected by model ID prefix).
 */
export function addSystemCacheControl(messages: ModelMessage[], modelId: string): ModelMessage[] {
  if (!modelId.startsWith("anthropic/")) return messages

  return messages.map((msg, index) => {
    if (index === 0 && msg.role === "system") {
      return {
        ...msg,
        providerOptions: {
          ...msg.providerOptions,
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      }
    }
    return msg
  })
}

/** Client-side tools that have no server execute — tool results come via addToolOutput */
const CLIENT_SIDE_TOOLS = new Set(["ask_user", "content_alternatives"])

/**
 * Build model messages from raw UI messages:
 * 1. Filter non-standard parts
 * 2. Fix orphaned client-side tool calls (no result persisted)
 * 3. Convert to model messages
 * 4. Fix file parts for gateway
 * 5. Prepend system message
 * 6. Add cache control for Anthropic
 */
export async function buildModelMessages(
  rawMessages: UIMessage[],
  systemPrompt: string,
  modelId: string,
): Promise<ModelMessage[]> {
  // Filter out non-standard parts (source-url etc.) before conversion.
  // Keep text, image, file, tool-invocation, step-start, and typed tool parts (tool-*).
  // step-start parts are CRITICAL: convertToModelMessages uses them to split multi-step
  // responses into separate model messages, ensuring correct tool_use → tool_result pairing.
  //
  // Fix orphaned client-side tool calls: ask_user and content_alternatives have no server
  // execute, so their results come via addToolOutput and are never persisted to DB.
  // When a chat is reloaded, these parts have state "input-available" with no output,
  // causing AI_MissingToolResultsError in convertToModelMessages. We add a synthetic
  // output so the model knows the tool was called and responded to.
  const cleanedMessages = rawMessages.map((msg) => ({
    ...msg,
    parts: msg.parts
      ?.filter((part) =>
        ALLOWED_PART_TYPES.has(part.type) || part.type.startsWith("tool-")
      )
      .map((part) => {
        const p = part as Record<string, unknown>
        // Detect orphaned client-side tool parts: type "tool-ask_user" / "tool-content_alternatives"
        // with state "input-available" (= no result) or "call" (legacy)
        if (
          typeof p.type === "string" &&
          p.type.startsWith("tool-") &&
          CLIENT_SIDE_TOOLS.has(p.type.slice(5)) &&
          (p.state === "input-available" || p.state === "call") &&
          p.output === undefined
        ) {
          return { ...p, state: "output-available" as const, output: { skipped: true } } as typeof part
        }
        return part
      }),
  })) satisfies UIMessage[]

  let modelMessages = fixFilePartsForGateway(
    await convertToModelMessages(cleanedMessages)
  )

  // Add system message with cache control for Anthropic
  modelMessages = [
    { role: "system" as const, content: systemPrompt },
    ...modelMessages,
  ]
  modelMessages = addSystemCacheControl(modelMessages, modelId)

  return modelMessages
}
