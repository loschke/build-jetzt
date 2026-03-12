"use client"
export default function ChatError({ reset }: { reset: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">Dieser Chat konnte nicht geladen werden.</p>
      <button onClick={reset} className="text-sm text-primary hover:underline">Erneut versuchen</button>
    </div>
  )
}
