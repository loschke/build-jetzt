"use client"

import { Button } from "@/components/ui/button"

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
      <p className="text-muted-foreground">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
      </p>
      <Button onClick={reset}>Erneut versuchen</Button>
    </div>
  )
}
