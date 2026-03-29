"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Pencil, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WorkspaceSkillEditor } from "./workspace-skill-editor"

interface SkillRow {
  id: string
  slug: string
  name: string
  description: string
  mode: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

interface WorkspaceSkillsProps {
  initialSkills: SkillRow[]
}

const SKILL_TEMPLATE = `---
name: Mein Skill
slug: mein-skill
description: Kurzbeschreibung was dieser Skill tut
mode: skill
---

Hier kommt der Skill-Inhalt als Markdown.

## Anweisungen

Beschreibe hier, was die KI tun soll wenn dieser Skill geladen wird.
`

export function WorkspaceSkills({ initialSkills }: WorkspaceSkillsProps) {
  const [skills, setSkills] = useState(initialSkills)
  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const refreshSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/user/skills")
      if (res.ok) setSkills(await res.json())
    } catch {
      // silent
    }
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" wirklich löschen?`)) return
    setLoading(id)
    try {
      const res = await fetch(`/api/user/skills/${id}`, { method: "DELETE" })
      if (res.ok) await refreshSkills()
    } catch {
      // silent
    } finally {
      setLoading(null)
    }
  }

  const handleSuccess = () => {
    refreshSkills()
    setView("list")
    setEditingSkillId(null)
  }

  if (view === "create") {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => setView("list")}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Neuer Skill</h1>
        </div>
        <WorkspaceSkillEditor
          initialContent={SKILL_TEMPLATE}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  if (view === "edit" && editingSkillId) {
    return (
      <div>
        <div className="mb-6 space-y-2">
          <Button variant="secondary" size="sm" onClick={() => { setView("list"); setEditingSkillId(null) }}>
            <X className="mr-1 size-4" /> Abbrechen
          </Button>
          <h1 className="text-lg font-semibold">Skill bearbeiten</h1>
        </div>
        <WorkspaceSkillEditor
          skillId={editingSkillId}
          onSuccess={handleSuccess}
        />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Meine Skills ({skills.length})</h1>
        <Button size="sm" onClick={() => setView("create")}>
          <Plus className="mr-1 size-4" /> Neuer Skill
        </Button>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            Du hast noch keine eigenen Fertigkeiten. Erstelle deinen ersten Skill um die KI an deine Arbeitsweise anzupassen.
          </p>
          <Button size="sm" onClick={() => setView("create")}>
            <Plus className="mr-1 size-4" /> Neuer Skill
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium md:px-4">Name</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Slug</th>
                <th className="px-3 py-2 text-left font-medium md:px-4">Modus</th>
                <th className="px-3 py-2 text-center font-medium md:px-4">Sichtbarkeit</th>
                <th className="px-3 py-2 text-right font-medium md:px-4">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {skills.map((skill) => (
                <tr key={skill.id} className="border-b last:border-0 hover:bg-muted/25">
                  <td className="px-3 py-2 md:px-4">
                    <div>
                      <span className="font-medium">{skill.name}</span>
                      <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
                    </div>
                  </td>
                  <td className="hidden px-4 py-2 md:table-cell">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{skill.slug}</code>
                  </td>
                  <td className="px-3 py-2 md:px-4">
                    <Badge variant={skill.mode === "quicktask" ? "default" : "secondary"}>
                      {skill.mode === "quicktask" ? "Quicktask" : "Skill"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center md:px-4">
                    {skill.isPublic ? (
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
                        onClick={() => { setEditingSkillId(skill.id); setView("edit") }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={loading === skill.id}
                        onClick={() => handleDelete(skill.id, skill.name)}
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
    </div>
  )
}
