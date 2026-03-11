import { streamText, convertToModelMessages, gateway } from "ai"

import { checkBodySize } from "@/lib/api-guards"
import { getUser } from "@/lib/auth"
import { chatConfig } from "@/config/chat"
import { features } from "@/config/features"
import { loadSystemPrompt } from "@/lib/chat/load-system-prompt"
import { MAX_MESSAGE_LENGTH } from "@/lib/constants"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { chatBodySchema, parseBody } from "@/lib/schemas"

export const maxDuration = 30

export async function POST(req: Request) {
  if (!features.chat.enabled) {
    return new Response("Chat is disabled", { status: 404 })
  }

  const user = await getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.chat)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const sizeError = checkBodySize(req)
  if (sizeError) return sizeError

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const parsed = parseBody(chatBodySchema, raw)
  if (!parsed.success) return parsed.response

  const { messages, moduleSlug } = parsed.data

  // Input-Validierung: letzte User-Nachricht pruefen
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === "user") {
    const textParts = lastMessage.parts
      ?.filter((part: { type: string }) => part.type === "text")
      .map((part: { text?: string }) => part.text || "")
      .join("") ?? ""
    if (textParts.length > MAX_MESSAGE_LENGTH) {
      return new Response("Message too long", { status: 400 })
    }
  }

  const systemPrompt = await loadSystemPrompt(
    chatConfig.guidePath,
    moduleSlug
  )

  const result = streamText({
    model: gateway(chatConfig.model),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as import("ai").UIMessage[]),
    maxOutputTokens: chatConfig.maxTokens,
    temperature: chatConfig.temperature,
  })

  return result.toUIMessageStreamResponse()
}
