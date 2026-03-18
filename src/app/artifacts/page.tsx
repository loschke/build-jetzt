import { ChatShell } from "@/components/layout/chat-shell"
import { ArtifactsOverview } from "@/components/artifacts/artifacts-overview"

export default function ArtifactsPage() {
  return (
    <ChatShell>
      <ArtifactsOverview />
    </ChatShell>
  )
}
