"use client"

import { useState, useEffect, useCallback } from "react"
import { WorkspaceGeneratorWizard } from "./workspace-generator-wizard"
import { WorkspaceSkillPreview } from "./workspace-skill-preview"
import type { WizardResult } from "./workspace-generator-wizard"

interface WorkspaceSkillEditorProps {
  skillId?: string
  initialContent?: string
  onSuccess: () => void
}

type EditorMode = "wizard" | "preview" | "loading"

export function WorkspaceSkillEditor({ skillId, initialContent, onSuccess }: WorkspaceSkillEditorProps) {
  const isNew = !skillId

  const [mode, setMode] = useState<EditorMode>(isNew ? "wizard" : "loading")
  const [skillContent, setSkillContent] = useState<string | null>(initialContent ?? null)
  const [loadError, setLoadError] = useState("")

  // Load existing skill for edit mode
  useEffect(() => {
    if (!skillId) return
    async function loadSkill() {
      try {
        const res = await fetch(`/api/user/skills/${skillId}`)
        if (res.ok) {
          const data = await res.json()
          setSkillContent(data.raw)
          setMode("preview")
        } else {
          setLoadError("Skill konnte nicht geladen werden")
        }
      } catch {
        setLoadError("Netzwerkfehler beim Laden")
      }
    }
    loadSkill()
  }, [skillId])

  const handleWizardComplete = useCallback((result: WizardResult) => {
    if (result.type !== "skill") return
    setSkillContent(result.content)
    setMode("preview")
  }, [])

  const handleRegenerate = useCallback(() => {
    setMode("wizard")
  }, [])

  if (mode === "loading") {
    if (loadError) {
      return <p className="text-sm text-destructive">{loadError}</p>
    }
    return <p className="text-sm text-muted-foreground">Lade Skill...</p>
  }

  if (mode === "wizard") {
    return (
      <WorkspaceGeneratorWizard
        type="skill"
        onComplete={handleWizardComplete}
      />
    )
  }

  if (mode === "preview" && skillContent) {
    return (
      <WorkspaceSkillPreview
        data={{ content: skillContent }}
        skillId={skillId}
        onRegenerate={isNew ? handleRegenerate : undefined}
        onSuccess={onSuccess}
      />
    )
  }

  return null
}
