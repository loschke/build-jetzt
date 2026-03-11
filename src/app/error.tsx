"use client"

import { Button } from "@/components/ui/button"

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Etwas ist schiefgelaufen</h1>
      <p className="text-muted-foreground">
        Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
      </p>
      <Button onClick={reset}>Erneut versuchen</Button>
    </div>
  )
}
