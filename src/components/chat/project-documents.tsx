"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { FileText, Trash2, Upload, Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArtifactEditor } from "@/components/assistant/artifact-editor"
import type { ProjectDocumentPublic } from "@/types/project"

interface DocumentsResponse {
  documents: ProjectDocumentPublic[]
  totalTokens: number
  limits: {
    maxCount: number
    tokenBudget: number
    maxFileSize: number
  }
}

interface ProjectDocumentsProps {
  /** Project to manage documents for. Component self-loads on mount/change. */
  projectId: string
  className?: string
}

/**
 * Knowledge-file management for a project: list, upload (.md/.txt) and delete.
 * Self-contained — talks to /api/projects/[id]/documents. Reused by the chat
 * project-settings dialog and the workspace project edit view.
 */
export function ProjectDocuments({ projectId, className }: ProjectDocumentsProps) {
  const [docs, setDocs] = useState<ProjectDocumentPublic[]>([])
  const [totalTokens, setTotalTokens] = useState(0)
  const [limits, setLimits] = useState<{ maxCount: number; tokenBudget: number; maxFileSize: number } | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editor state
  const [editingDoc, setEditingDoc] = useState<{ id: string; title: string } | null>(null)
  const [editorContent, setEditorContent] = useState("")
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    if (!projectId) return
    setIsLoadingDocs(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`)
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
  }, [projectId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !projectId) return

    setDocError(null)
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch(`/api/projects/${projectId}/documents`, {
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

  async function openEditor(doc: ProjectDocumentPublic) {
    setEditError(null)
    setEditorContent("")
    setEditingDoc({ id: doc.id, title: doc.title })
    setIsLoadingContent(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${doc.id}`)
      if (!res.ok) {
        setEditError("Datei konnte nicht geladen werden")
        return
      }
      const data = await res.json()
      setEditorContent(data.content ?? "")
    } catch {
      setEditError("Datei konnte nicht geladen werden")
    } finally {
      setIsLoadingContent(false)
    }
  }

  async function handleSaveEdit() {
    if (!editingDoc) return
    setEditError(null)
    setIsSavingEdit(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${editingDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorContent }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Speichern fehlgeschlagen" }))
        setEditError(data.error ?? "Speichern fehlgeschlagen")
        return
      }
      setEditingDoc(null)
      await loadDocuments()
    } catch {
      setEditError("Speichern fehlgeschlagen")
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function handleDeleteDoc(docId: string) {
    if (!projectId) return
    setDocError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "DELETE",
      })
      if (!res.ok) return
      await loadDocuments()
    } catch {
      // silent
    }
  }

  const canUpload = limits ? docs.length < limits.maxCount && totalTokens < limits.tokenBudget : false

  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
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
                    onClick={() => openEditor(doc)}
                    title="Bearbeiten"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Löschen"
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

      {/* Editor dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(o) => { if (!o) setEditingDoc(null) }}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{editingDoc?.title}</DialogTitle>
          </DialogHeader>

          {isLoadingContent ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Lade Inhalt...
            </div>
          ) : (
            <div className="h-[55vh] overflow-hidden rounded-md border">
              <ArtifactEditor
                value={editorContent}
                onChange={setEditorContent}
                language="markdown"
              />
            </div>
          )}

          {editError && <p className="text-xs text-destructive">{editError}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingDoc(null)}
              disabled={isSavingEdit}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isLoadingContent || isSavingEdit || !editorContent.trim()}
            >
              {isSavingEdit && <Loader2 className="mr-2 size-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
