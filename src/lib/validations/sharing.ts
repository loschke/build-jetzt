import { z } from "zod"

/** Schema for adding a member to a project. */
export const addMemberSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(["editor"]).optional().default("editor"),
})

/** Schema for sharing a chat with a user. */
export const shareChatSchema = z.object({
  email: z.string().email().max(255),
})
