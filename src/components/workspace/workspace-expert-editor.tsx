"use client"

import { useState, useEffect } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface WorkspaceExpertEditorProps {
  expertId?: string
  onSuccess: () => void
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function WorkspaceExpertEditor({ expertId, onSuccess }: WorkspaceExpertEditorProps) {
  const isNew = !expertId
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugManual) setSlug(slugify(val))
    setStatus("idle")
  }

  useEffect(() => {
    if (!expertId) return
    async function loadExpert() {
      try {
        const res = await fetch(`/api/experts/${expertId}`)
        if (res.ok) {
          const data = await res.json()
          setName(data.name)
          setSlug(data.slug)
          setSlugManual(true)
          setDescription(data.description)
          setSystemPrompt(data.systemPrompt)
          setIsPublic(data.isPublic ?? false)
        } else {
          setMessage("Expert konnte nicht geladen werden")
          setStatus("error")
        }
      } catch {
        setMessage("Netzwerkfehler beim Laden")
        setStatus("error")
      } finally {
        setLoading(false)
      }
    }
    loadExpert()
  }, [expertId])

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || !description.trim() || !systemPrompt.trim()) {
      setStatus("error")
      setMessage("Alle Felder muessen ausgefuellt sein.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const body = { name, slug, description, systemPrompt, isPublic }
      const url = isNew ? "/api/experts" : `/api/experts/${expertId}`
      const method = isNew ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(isNew ? "Expert erstellt." : "Expert aktualisiert.")
        setTimeout(onSuccess, 800)
      } else {
        setStatus("error")
        setMessage(data.error ?? "Speichern fehlgeschlagen")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Lade Expert...</p>
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="expert-name">Name</Label>
        <Input
          id="expert-name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="z.B. Mein SEO-Berater"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expert-slug">Slug</Label>
        <Input
          id="expert-slug"
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugManual(true); setStatus("idle") }}
          placeholder="z.B. mein-seo-berater"
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">Eindeutiger Bezeichner. Wird automatisch aus dem Namen generiert.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="expert-description">Beschreibung</Label>
        <Input
          id="expert-description"
          value={description}
          onChange={(e) => { setDescription(e.target.value); setStatus("idle") }}
          placeholder="Kurzbeschreibung fuer die Expert-Auswahl"
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="expert-prompt">System-Prompt</Label>
        <Textarea
          id="expert-prompt"
          value={systemPrompt}
          onChange={(e) => { setSystemPrompt(e.target.value); setStatus("idle") }}
          placeholder="Anweisungen die die KI-Persona definieren..."
          className="min-h-[200px]"
          maxLength={10000}
        />
        <p className="text-xs text-muted-foreground">Definiert das Verhalten und die Persoenlichkeit des Experten.</p>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          id="expert-public"
          checked={isPublic}
          onCheckedChange={setIsPublic}
        />
        <Label htmlFor="expert-public" className="text-sm">
          Oeffentlich — andere Nutzer koennen diesen Expert verwenden
        </Label>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={status === "saving"}
      >
        {status === "saving" ? "Speichere..." : isNew ? "Erstellen" : "Speichern"}
      </Button>
    </div>
  )
}
