import { redirect } from "next/navigation"
import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"
import { LandingPage } from "@/components/landing/landing-page"
import { getUser } from "@/lib/auth"
import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"
import { features } from "@/config/features"
import { ensureUserExists, getUserStatus, getUserRole } from "@/lib/db/queries/users"
import { isAdminRole } from "@/lib/admin-guard"
import { ExternalLink } from "lucide-react"

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const user = await getUser()

  // Authenticated: check approval status before showing chat
  if (user) {
    await ensureUserExists({ logtoId: user.id, email: user.email, name: user.name })
    const [status, role] = await Promise.all([
      getUserStatus(user.id),
      getUserRole(user.id),
    ])

    if (status !== "approved" && !isAdminRole(role)) {
      redirect("/pending-approval")
    }

    const { project: projectId } = await searchParams
    return (
      <ChatShell>
        <ChatView userName={user.name} initialProjectId={projectId} ttsEnabled={features.tts.enabled} />
      </ChatShell>
    )
  }

  // Unauthenticated: show landing page
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame — breiter als in der App Shell */}
      <div
        className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary sm:border-[8px]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between border-b border-border px-6 py-5 sm:px-8">
        <BrandWordmark />
        {brand.websiteUrl && (
          <a
            href={brand.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {brand.domain}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </header>

      {/* Landing Page */}
      <main className="flex-1">
        <LandingPage />
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="micro-label">{brand.name}</p>
          <p className="micro-label">&copy; 2026</p>
        </div>
      </footer>
    </div>
  )
}
