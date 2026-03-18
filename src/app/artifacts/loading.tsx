import { ChatShell } from "@/components/layout/chat-shell"

export default function ArtifactsLoading() {
  return (
    <ChatShell>
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-4">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </ChatShell>
  )
}
