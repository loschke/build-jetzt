import { signOut } from "@logto/next/server-actions"
import { redirect } from "next/navigation"
import { logtoConfig } from "@/lib/logto"

export async function GET() {
  try {
    await signOut(logtoConfig, logtoConfig.baseUrl)
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error
    redirect("/")
  }
}
