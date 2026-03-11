import { streamText, convertToModelMessages, gateway } from "ai"
import type { ModelMessage } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

import { getUser } from "@/lib/auth"
import { features } from "@/config/features"
import { getAvailableFormats } from "@/config/formats"
import { getActiveMCPServers } from "@/config/mcp"
import { assistantConfig } from "@/config/assistants"
import { loadAssistantPrompt } from "@/lib/assistant/load-prompt"
import { connectMCPServers } from "@/lib/mcp"
import { MAX_MESSAGE_LENGTH, MAX_BODY_SIZE } from "@/lib/constants"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { assistantChatBodySchema, parseBody } from "@/lib/schemas"

/**
 * Convert data-URL strings in file parts to Uint8Array so the AI Gateway's
 * `maybeEncodeFileParts` can re-encode them as proper data-URLs.
 */
function fixFilePartsForGateway(messages: ModelMessage[]): ModelMessage[] {
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
 * Strip gateway-encrypted tool results from message history.
 * Web search/fetch via gateway() produce encrypted_content blocks that the
 * direct anthropic() provider cannot parse. When switching to direct API
 * (for skills), we filter out these tool-result parts.
 */
function stripEncryptedToolResults(messages: ModelMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (!Array.isArray(msg.content)) return msg
    const filtered = msg.content.filter((part) => {
      // Remove tool-result parts that reference gateway web tools
      if (part.type === "tool-result") {
        const toolName = (part as { toolName?: string }).toolName ?? ""
        if (toolName === "web_search" || toolName === "web_fetch") return false
      }
      return true
    })
    // Also remove corresponding tool-call parts
    const toolResultIds = new Set(
      msg.content
        .filter((p) => p.type === "tool-result" && ["web_search", "web_fetch"].includes((p as { toolName?: string }).toolName ?? ""))
        .map((p) => (p as { toolCallId?: string }).toolCallId)
    )
    const cleaned = filtered.filter((part) => {
      if (part.type === "tool-call" && toolResultIds.has((part as { toolCallId?: string }).toolCallId)) return false
      return true
    })
    if (cleaned.length === 0) return null
    return { ...msg, content: cleaned }
  }).filter((msg): msg is ModelMessage => msg !== null)
}

export const maxDuration = 120

const ALLOWED_MIME_TYPES = new Set(
  assistantConfig.upload.accept.split(",").map((t) => t.trim())
)

export async function POST(req: Request) {
  if (!features.assistant.enabled) {
    return new Response("Assistant is disabled", { status: 404 })
  }

  const user = await getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.chat)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return new Response("Request too large", { status: 413 })
  }

  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return new Response("Invalid request body", { status: 400 })
  }

  if (rawBody.length > MAX_BODY_SIZE) {
    return new Response("Request too large", { status: 413 })
  }

  let raw: unknown
  try {
    raw = JSON.parse(rawBody)
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseBody(assistantChatBodySchema, raw)
  if (!parsed.success) return parsed.response

  const { messages, expertSlug, thinking, format } = parsed.data
  const slug = expertSlug ?? "general"

  // Format config from registry
  const formats = getAvailableFormats()
  const activeFormat = format ? formats.find((f) => f.id === format) : null
  const needsSkill = activeFormat?.skillId != null

  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    const textParts =
      lastMessage.parts
        ?.filter((part: { type: string }) => part.type === "text")
        .map((part: { text?: string }) => part.text || "")
        .join("") ?? ""
    if (textParts.length > MAX_MESSAGE_LENGTH) {
      return new Response("Message too long", { status: 400 })
    }

    const fileParts = lastMessage.parts?.filter(
      (part: { type: string }) => part.type === "file"
    )
    if (fileParts) {
      for (const filePart of fileParts) {
        if (filePart.mediaType && !ALLOWED_MIME_TYPES.has(filePart.mediaType)) {
          return new Response("File type not allowed", { status: 400 })
        }
      }
    }
  }

  let systemPrompt: string
  try {
    systemPrompt = await loadAssistantPrompt(slug)
  } catch {
    return new Response("Expert not found", { status: 404 })
  }

  let modelMessages = fixFilePartsForGateway(await convertToModelMessages(messages as import("ai").UIMessage[]))

  // When using direct anthropic() provider for skills, strip gateway-encrypted
  // web tool results from previous turns to avoid "Invalid encrypted_content" errors
  if (needsSkill) {
    modelMessages = stripEncryptedToolResults(modelMessages)
  }

  // Build tools based on mode:
  // - Skill requests use direct anthropic() provider, so web tools (which produce
  //   gateway-encrypted search results) are incompatible. Only code_execution.
  // - Normal requests use gateway() with web tools.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = needsSkill
    ? {
        code_execution: anthropic.tools.codeExecution_20260120(),
      }
    : {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
        web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 3 }),
      }

  // MCP tools (only in normal mode, not skill mode)
  let mcpHandle: { tools: Record<string, unknown>; close: () => Promise<void> } | null = null
  if (features.mcp.enabled && !needsSkill) {
    const servers = getActiveMCPServers(slug)
    if (servers.length > 0) {
      mcpHandle = await connectMCPServers(servers)
      Object.assign(tools, mcpHandle.tools)
    }
  }

  // Build provider options
  function buildProviderOptions() {
    if (!thinking && !needsSkill) return undefined
    return {
      anthropic: {
        ...(thinking
          ? { thinking: { type: "enabled" as const, budgetTokens: assistantConfig.thinkingBudget } }
          : {}),
        ...(needsSkill && activeFormat?.skillId
          ? { container: { skills: [{ type: "custom" as const, skillId: activeFormat.skillId }] } }
          : {}),
      },
    }
  }

  // Skills are tied to the user's Anthropic API key, so we must use
  // the direct anthropic() provider instead of gateway() for skill requests.
  const model = needsSkill
    ? anthropic(assistantConfig.model.replace("anthropic/", ""))
    : gateway(assistantConfig.model)

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    maxOutputTokens: thinking
      ? assistantConfig.thinkingMaxTokens
      : activeFormat?.maxTokens ?? assistantConfig.maxTokens,
    ...(thinking ? {} : { temperature: assistantConfig.temperature }),
    tools,
    providerOptions: buildProviderOptions(),
    onFinish: mcpHandle
      ? async () => {
          await mcpHandle!.close()
        }
      : undefined,
  })

  return result.toUIMessageStreamResponse({
    sendReasoning: thinking ?? false,
    sendSources: true,
  })
}
