"use client"

import { useState, useCallback, useEffect } from "react"
import { Users, Trash2, Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Recipient {
  id: string
  sharedWithId: string
  name: string | null
  email: string | null
  createdAt: string
}

interface UserShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatId: string
  chatTitle: string
}

export function UserShareDialog({ open, onOpenChange, chatId, chatTitle }: UserShareDialogProps) {
  const [email, setEmail] = useState("")
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecipients = useCallback(async () => {
    try {
      const res = await fetch(`/api/chats/${chatId}/share-with`)
      if (res.ok) {
        setRecipients(await res.json())
      }
    } catch {
      // Silently fail
    }
  }, [chatId])

  useEffect(() => {
    if (open) {
      setEmail("")
      setError(null)
      loadRecipients()
    }
  }, [open, loadRecipients])

  const handleShare = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed) return

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/chats/${chatId}/share-with`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      if (res.ok) {
        setEmail("")
        loadRecipients()
      } else {
        const data = await res.json()
        setError(data.error ?? "Fehler beim Teilen")
      }
    } catch {
      setError("Fehler beim Teilen")
    } finally {
      setIsLoading(false)
    }
  }, [chatId, email, loadRecipients])

  const handleRevoke = useCallback(async (shareId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}/share-with/${shareId}`, { method: "DELETE" })
      if (res.ok) {
        setRecipients((prev) => prev.filter((r) => r.id !== shareId))
      }
    } catch {
      // Silently fail
    }
  }, [chatId])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mit Nutzer teilen</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{chatTitle}&rdquo; mit einem registrierten Nutzer teilen. Der Empfänger kann den Chat lesen.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          onSubmit={(e) => { e.preventDefault(); handleShare() }}
          className="flex gap-2"
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email-Adresse"
            className="text-sm"
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !email.trim()} size="sm">
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            <span className="ml-1.5">Teilen</span>
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {recipients.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Geteilt mit</p>
            <div className="space-y-1">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex flex-col">
                    <span>{r.name ?? r.email}</span>
                    {r.name && r.email && (
                      <span className="text-xs text-muted-foreground">{r.email}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRevoke(r.id)}
                    aria-label="Freigabe widerrufen"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Schliessen</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
