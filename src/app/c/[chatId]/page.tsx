import { ChatShell } from "@/components/layout/chat-shell"
import { ChatView } from "@/components/chat/chat-view"

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ chatId: string }>
  searchParams: Promise<{ artifact?: string }>
}) {
  const { chatId } = await params
  const { artifact: initialArtifactId } = await searchParams
  return (
    <ChatShell>
      <ChatView chatId={chatId} initialArtifactId={initialArtifactId} />
    </ChatShell>
  )
}
