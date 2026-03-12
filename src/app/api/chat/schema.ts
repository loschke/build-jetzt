import { z } from "zod"

export const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  mediaType: z.string().optional(),
  data: z.union([z.string(), z.instanceof(Uint8Array)]).optional(),
  filename: z.string().optional(),
})

export const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
  parts: z.array(messagePartSchema).optional(),
})

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  chatId: z.string().max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  modelId: z.string().optional(),
})

export type MessagePart = z.infer<typeof messagePartSchema>
export type ChatMessage = z.infer<typeof messageSchema>
