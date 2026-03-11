import { NextRequest } from "next/server"

import { features } from "@/config/features"
import { chatConfig } from "@/config/chat"
import { loadQuestions } from "@/lib/chat/load-questions"

export async function GET(req: NextRequest) {
  if (!features.chat.enabled) {
    return Response.json([])
  }

  const moduleSlug = req.nextUrl.searchParams.get("module")
  if (!moduleSlug) {
    return Response.json([])
  }

  const questions = await loadQuestions(chatConfig.guidePath, moduleSlug)
  return Response.json(questions)
}
