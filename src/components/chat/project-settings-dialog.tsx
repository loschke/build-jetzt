"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FileText, Trash2, Upload, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectDocumentPublic } from "@/types/project"

interface ProjectSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** If provided, we're editing an existing project */
  project?: {
    id: string
    name: string
    description: string | null
    instructions: string | null
    defaultExpertId: string | null
  } | null
  onSave: (data: {
    name: string
    description?: string
    instructions?: string
  }) => void
}

interface DocumentsResponse {
  documents: ProjectDocumentPublic[]
  totalTokens: number
  limits: {
    maxCount: number
    tokenBudget: number
    maxFileSize: number
  }
}

export function ProjectSettingsDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectSettingsDialogProps) {
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [instructions, setInstructions] = useState(project?.instructions ?? "")
  const [isSaving, setIsSaving] = useState(false)

  // Document management state
  const [docs, setDocs] = useState<ProjectDocumentPublic[]>([])
  const [totalTokens, setTotalTokens] = useState(0)
  const [limits, setLimits] = useState<{ maxCount: number; tokenBudget: number; maxFileSize: number } | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!project

  const loadDocuments = useCallback(async () => {
    if (!project?.id) return
    setIsLoadingDocs(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/documents`)
      if (!res.ok) return
      const data: DocumentsResponse = await res.json()
      setDocs(data.documents)
      setTotalTokens(data.totalTokens)
      setLimits(data.limits)
    } catch {
      // silent
    } finally {
      setIsLoadingDocs(false)
    }
  }, [project?.id])

  // Load full project data (instructions etc.) when dialog opens
  useEffect(() => {
    if (!open || !project?.id) return
    loadDocuments()
    fetch(`/api/projects/${project.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return
        if (data.instructions !== undefined) setInstructions(data.instructions ?? "")
        if (data.description !== undefined) setDescription(data.description ?? "")
      })
      .catch(() => {})
  }, [open, project?.id, loadDocuments])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !project?.id) return

    setDocError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/projects/${project.id}/documents`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload fehlgeschlagen" }))
        setDocError(data.error)
        return
      }
      await loadDocuments()
    } catch {
      setDocError("Upload fehlgeschlagen")
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!project?.id) return
    setDocError(null)
    try {
      const res = await fetch(`/api/projects/${project.id}/documents/${docId}`, {
        method: "DELETE",
      })
      if (!res.ok) return
      await loadDocuments()
    } catch {
      // silent
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
      })
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const canUpload = limits ? docs.length < limits.maxCount && totalTokens < limits.tokenBudget : false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Projekt bearbeiten" : "Neues Projekt"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Website Relaunch"
              maxLength={100}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-description">Beschreibung</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Beschreibung (optional)"
              maxLength={500}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-instructions">Instruktionen</Label>
            <Textarea
              id="project-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Spezifische Anweisungen für die KI in diesem Projekt (optional)"
              rows={5}
              maxLength={10000}
            />
            <p className="text-xs text-muted-foreground">
              Diese Anweisungen werden bei jedem Chat in diesem Projekt berücksichtigt.
            </p>
          </div>

          {/* Document management — only shown when editing */}
          {isEdit && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Kontext-Dateien</Label>
                {limits && (
                  <span className="text-xs text-muted-foreground">
                    {totalTokens.toLocaleString("de-DE")} / {limits.tokenBudget.toLocaleString("de-DE")} Tokens ({docs.length}/{limits.maxCount} Dateien)
                  </span>
                )}
              </div>

              {isLoadingDocs ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Lade Dateien...
                </div>
              ) : (
                <>
                  {/* Document list */}
                  {docs.length > 0 && (
                    <div className="flex flex-col gap-1">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate">{doc.title}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            ~{doc.tokenCount.toLocaleString("de-DE")} Tokens
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => handleDeleteDoc(doc.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md,.txt"
                      onChange={handleUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!canUpload || isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 size-4" />
                      )}
                      Datei hochladen
                    </Button>
                  </div>

                  {docError && (
                    <p className="text-xs text-destructive">{docError}</p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    .md und .txt Dateien{limits ? ` (max ${limits.maxFileSize / 1000}KB)` : ""}. Inhalte werden als Kontext in jedem Chat berücksichtigt.
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim() || isSaving}>
              {isEdit ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
