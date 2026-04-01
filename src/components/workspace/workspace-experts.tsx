"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { WorkspaceExpertEditor } from "./workspace-expert-editor"

interface ExpertRow {
  id: string
  name: string
  slug: string
  description: string
  icon: string | null
  systemPrompt: string
  skillSlugs: string[]
  modelPreference: string | null
  temperature: number | null
  allowedTools: string[]
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

interface WorkspaceExpertsProps {
  initialExperts: ExpertRow[]
}

export function WorkspaceExperts({ initialExperts }: WorkspaceExpertsProps) {
  const [experts, setExperts] = useState(initialExperts)
  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [editingExpertId, setEditingExpertId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const refreshExperts = useCallback(async () => {
    try {
      const res = await fetch("/api/experts")
      if (res.ok) {
        const all: Array<ExpertRow & { isGlobal: boolean }> = await res.json()
        setExperts(all.filter((e) => !e.isGlobal))
      }
    } catch {
      // Refresh failed — list stays as-is
    }
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setLoading(deleteTarget.id)
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/experts/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) await refreshExperts()
    } catch {
      // silent
    } finally {
      setLoading(null)
    }
  }

  const handleSuccess = () => {
    refreshExperts()
    setView("list")
    setEditingExpertId(null)
  }

  if (view === "create") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Neuer Expert</h1>
        </div>
        <WorkspaceExpertEditor onSuccess={handleSuccess} />
      </div>
    )
  }

  if (view === "edit" && editingExpertId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingExpertId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Expert bearbeiten</h1>
        </div>
        <WorkspaceExpertEditor expertId={editingExpertId} onSuccess={handleSuccess} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Meine Experten ({experts.length})</h1>
        <Button size="sm" onClick={() => setView("create")}>
          <Plus className="mr-1 size-4" /> Neuer Expert
        </Button>
      </div>

      {experts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Erstelle eigene Experten mit massgeschneidertem System-Prompt und Skill-Zuordnung.
          </p>
          <Button size="sm" onClick={() => setView("create")}>
            <Plus className="mr-1 size-4" /> Neuer Expert
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium md:px-4">Name</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Slug</th>
                <th className="px-3 py-2 text-center font-medium md:px-4">Sichtbarkeit</th>
                <th className="px-3 py-2 text-right font-medium md:px-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((expert) => (
                <tr key={expert.id} className="border-b last:border-0 hover:bg-muted/25">
                  <td className="px-3 py-2 md:px-4">
                    <div>
                      <span className="font-medium">{expert.name}</span>
                      <p className="text-xs text-muted-foreground line-clamp-1">{expert.description}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{expert.slug}</code>
                  </td>
                  <td className="px-3 py-2 text-center md:px-4">
                    {expert.isPublic ? (
                      <Globe className="mx-auto size-4 text-blue-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground">Privat</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right md:px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => { setEditingExpertId(expert.id); setView("edit") }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={loading === expert.id}
                        onClick={() => setDeleteTarget({ id: expert.id, name: expert.name })}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expert löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; wird unwiderruflich gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
