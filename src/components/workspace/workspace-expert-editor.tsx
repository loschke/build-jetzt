"use client"

import { useState, useEffect, useCallback } from "react"
import { WorkspaceGeneratorWizard } from "./workspace-generator-wizard"
import { WorkspaceExpertPreview } from "./workspace-expert-preview"
import type { WizardResult } from "./workspace-generator-wizard"

interface ExpertData {
  name: string
  slug: string
  description: string
  systemPrompt: string
}

interface WorkspaceExpertEditorProps {
  expertId?: string
  onSuccess: () => void
}

type EditorMode = "wizard" | "preview" | "loading"

export function WorkspaceExpertEditor({ expertId, onSuccess }: WorkspaceExpertEditorProps) {
  const isNew = !expertId

  const [mode, setMode] = useState<EditorMode>(isNew ? "wizard" : "loading")
  const [expertData, setExpertData] = useState<ExpertData | null>(null)
  const [wizardDescription, setWizardDescription] = useState("")
  const [loadError, setLoadError] = useState("")

  // Load existing expert for edit mode
  useEffect(() => {
    if (!expertId) return
    async function loadExpert() {
      try {
        const res = await fetch(`/api/experts/${expertId}`)
        if (res.ok) {
          const data = await res.json()
          setExpertData({
            name: data.name,
            slug: data.slug,
            description: data.description,
            systemPrompt: data.systemPrompt,
          })
          setMode("preview")
        } else {
          setLoadError("Expert konnte nicht geladen werden")
        }
      } catch {
        setLoadError("Netzwerkfehler beim Laden")
      }
    }
    loadExpert()
  }, [expertId])

  const handleWizardComplete = useCallback((result: WizardResult) => {
    if (result.type !== "expert") return
    setExpertData({
      name: result.name,
      slug: result.slug,
      description: result.description,
      systemPrompt: result.systemPrompt,
    })
    setMode("preview")
  }, [])

  const handleRegenerate = useCallback(() => {
    setMode("wizard")
  }, [])

  if (mode === "loading") {
    if (loadError) {
      return <p className="text-sm text-destructive">{loadError}</p>
    }
    return <p className="text-sm text-muted-foreground">Lade Expert...</p>
  }

  if (mode === "wizard") {
    return (
      <WorkspaceGeneratorWizard
        type="expert"
        onComplete={handleWizardComplete}
        initialDescription={wizardDescription}
      />
    )
  }

  if (mode === "preview" && expertData) {
    return (
      <WorkspaceExpertPreview
        data={expertData}
        expertId={expertId}
        onRegenerate={isNew ? () => {
          setWizardDescription("")
          handleRegenerate()
        } : undefined}
        onSuccess={onSuccess}
      />
    )
  }

  return null
}
