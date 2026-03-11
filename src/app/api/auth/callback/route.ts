import { handleSignIn } from "@logto/next/server-actions"
import { redirect } from "next/navigation"
import { logtoConfig } from "@/lib/logto"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  try {
    await handleSignIn(logtoConfig, new URL(request.url))
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    redirect("/")
  }
}
