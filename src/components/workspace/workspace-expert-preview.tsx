"use client"

import { useState, useCallback } from "react"
import { Pencil, Check, AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PreviewField } from "./preview-field"

interface ExpertData {
  name: string
  slug: string
  description: string
  systemPrompt: string
}

interface WorkspaceExpertPreviewProps {
  data: ExpertData
  expertId?: string
  onRegenerate?: () => void
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

export function WorkspaceExpertPreview({ data, expertId, onRegenerate, onSuccess }: WorkspaceExpertPreviewProps) {
  const isNew = !expertId

  const [name, setName] = useState(data.name)
  const [slug, setSlug] = useState(data.slug)
  const [description, setDescription] = useState(data.description)
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt)

  const [editingField, setEditingField] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const startEdit = useCallback((field: string) => {
    setEditingField(field)
    setStatus("idle")
  }, [])

  const confirmEdit = useCallback(() => {
    setEditingField(null)
  }, [])

  const handleNameChange = useCallback((val: string) => {
    setName(val)
    // Auto-update slug when editing name (only for new experts)
    if (isNew) setSlug(slugify(val))
  }, [isNew])

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || !description.trim() || !systemPrompt.trim()) {
      setStatus("error")
      setMessage("Alle Felder muessen ausgefuellt sein.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const body = { name, slug, description, systemPrompt }
      const url = isNew ? "/api/experts" : `/api/experts/${expertId}`
      const method = isNew ? "POST" : "PATCH"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const responseData = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(isNew ? "Expert erstellt." : "Expert aktualisiert.")
        setTimeout(onSuccess, 800)
      } else if (res.status === 409) {
        setStatus("error")
        setMessage("Ein Expert mit diesem Slug existiert bereits. Bitte den Namen anpassen.")
      } else {
        setStatus("error")
        setMessage(responseData.error ?? "Speichern fehlgeschlagen")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Name */}
      <PreviewField
        label="Name"
        value={name}
        editing={editingField === "name"}
        onStartEdit={() => startEdit("name")}
        onConfirmEdit={confirmEdit}
        renderEdit={() => (
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={100}
            autoFocus
          />
        )}
      />

      {/* Slug (only shown when editing name for new, or always for edit) */}
      {(editingField === "name" || !isNew) && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Slug</Label>
          <p className="text-sm">
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{slug}</code>
          </p>
        </div>
      )}

      {/* Description */}
      <PreviewField
        label="Beschreibung"
        value={description}
        editing={editingField === "description"}
        onStartEdit={() => startEdit("description")}
        onConfirmEdit={confirmEdit}
        renderEdit={() => (
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            autoFocus
          />
        )}
      />

      {/* System Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>System-Prompt</Label>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => editingField === "systemPrompt" ? confirmEdit() : startEdit("systemPrompt")}
          >
            {editingField === "systemPrompt" ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          </Button>
        </div>
        {editingField === "systemPrompt" ? (
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="min-h-[300px] font-mono text-xs"
            maxLength={10000}
            autoFocus
          />
        ) : (
          <pre className="max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
            {systemPrompt}
          </pre>
        )}
      </div>

      {/* Status message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {onRegenerate && (
          <Button variant="secondary" onClick={onRegenerate} disabled={status === "saving"}>
            <RotateCcw className="mr-1.5 size-4" />
            Nochmal generieren
          </Button>
        )}
        <Button onClick={handleSave} disabled={status === "saving"}>
          {status === "saving" ? "Speichere..." : isNew ? "Erstellen" : "Speichern"}
        </Button>
      </div>
    </div>
  )
}

