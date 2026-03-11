import { NextResponse } from "next/server"

import { getUser } from "@/lib/auth"
import { features } from "@/config/features"
import { listExperts } from "@/lib/assistant/list-experts"

export async function GET() {
  if (!features.assistant.enabled) {
    return new Response("Assistant is disabled", { status: 404 })
  }

  const user = await getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const experts = await listExperts()
  return NextResponse.json(experts)
}
