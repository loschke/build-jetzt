"use client"

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Fehler im Admin-Bereich</h2>
      <p className="text-sm text-muted-foreground">
        {error.message || "Ein unerwarteter Fehler ist aufgetreten."}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Erneut versuchen
      </button>
    </div>
  )
}
