import { getUser } from "@/lib/auth"
import { features } from "@/config/features"

export async function GET(req: Request) {
  if (!features.assistant.enabled) {
    return new Response("Assistant is disabled", { status: 404 })
  }

  const user = await getUser()
  if (!user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("id")
  if (!fileId || !/^file_[a-zA-Z0-9]+$/.test(fileId)) {
    return new Response("Invalid file ID", { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response("Anthropic API key not configured", { status: 500 })
  }

  const res = await fetch(
    `https://api.anthropic.com/v1/files/${fileId}/content`,
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "files-api-2025-04-14",
      },
    }
  )

  if (!res.ok) {
    return new Response("Failed to retrieve file", { status: res.status })
  }

  const content = await res.text()
  return new Response(content, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "text/html",
    },
  })
}
