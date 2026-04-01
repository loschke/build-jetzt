"use client"

import { useState, useCallback, useMemo } from "react"
import { Pencil, Check, AlertCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownEditor } from "@/components/shared/markdown-editor"
import { PreviewField } from "./preview-field"

interface SkillData {
  content: string // Complete SKILL.md with frontmatter
}

interface WorkspaceSkillPreviewProps {
  data: SkillData
  skillId?: string
  onRegenerate?: () => void
  onSuccess: () => void
}

/** Extract a YAML field value, handling block scalars (>-, |-, >, |) */
function getYamlValue(fm: string, field: string): string {
  const lines = fm.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(new RegExp(`^${field}:\\s*(.*)$`))
    if (!match) continue

    const inlineValue = match[1].trim()
    // Simple inline value (most common)
    if (inlineValue && !["|-", ">-", "|", ">"].includes(inlineValue)) {
      return inlineValue
    }
    // Block scalar: collect indented lines that follow
    const parts: string[] = []
    for (let j = i + 1; j < lines.length; j++) {
      if (/^\s+/.test(lines[j])) {
        parts.push(lines[j].trim())
      } else {
        break
      }
    }
    return parts.join(" ")
  }
  return ""
}

interface SkillField {
  key: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
  options?: string[]
}

/** Extract fields array from YAML frontmatter (simplified parser for display) */
function extractFields(fm: string): SkillField[] {
  const fields: SkillField[] = []
  const lines = fm.split("\n")

  let inFields = false
  let current: Partial<SkillField> | null = null
  let inOptions = false

  for (const line of lines) {
    // Detect fields: block start
    if (/^fields:\s*$/.test(line)) {
      inFields = true
      continue
    }
    if (!inFields) continue

    // New field item
    if (/^\s{2}- key:\s*(.+)/.test(line)) {
      if (current?.key) fields.push(current as SkillField)
      current = { key: line.match(/key:\s*(.+)/)?.[1]?.trim() ?? "" }
      inOptions = false
      continue
    }

    if (!current) continue

    // Field properties
    const labelMatch = line.match(/^\s{4}label:\s*(.+)/)
    if (labelMatch) { current.label = labelMatch[1].trim(); continue }

    const typeMatch = line.match(/^\s{4}type:\s*(.+)/)
    if (typeMatch) { current.type = typeMatch[1].trim(); continue }

    const reqMatch = line.match(/^\s{4}required:\s*(.+)/)
    if (reqMatch) { current.required = reqMatch[1].trim() === "true"; continue }

    const phMatch = line.match(/^\s{4}placeholder:\s*["']?(.+?)["']?\s*$/)
    if (phMatch) { current.placeholder = phMatch[1]; continue }

    // Options block
    if (/^\s{4}options:\s*$/.test(line)) {
      inOptions = true
      current.options = []
      continue
    }

    if (inOptions) {
      const optMatch = line.match(/^\s{6}- (.+)/)
      if (optMatch) {
        current.options?.push(optMatch[1].trim())
        continue
      }
      // End of options (non-matching line)
      inOptions = false
    }

    // End of fields block (non-indented line)
    if (!/^\s/.test(line)) {
      if (current?.key) fields.push(current as SkillField)
      break
    }
  }

  // Push last field
  if (current?.key && !fields.some(f => f.key === current!.key)) {
    fields.push(current as SkillField)
  }

  return fields
}

/** Extract frontmatter values from raw SKILL.md content */
function extractFrontmatter(content: string): { name: string; slug: string; description: string; mode: string; category: string; icon: string; fields: SkillField[]; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return { name: "", slug: "", description: "", mode: "skill", category: "", icon: "", fields: [], body: content }

  const frontmatter = match[1]
  const body = match[2]

  return {
    name: getYamlValue(frontmatter, "name"),
    slug: getYamlValue(frontmatter, "slug"),
    description: getYamlValue(frontmatter, "description"),
    mode: getYamlValue(frontmatter, "mode") || "skill",
    category: getYamlValue(frontmatter, "category"),
    icon: getYamlValue(frontmatter, "icon"),
    fields: extractFields(frontmatter),
    body,
  }
}

/** Rebuild SKILL.md content from edited name/description + full content */
function updateFrontmatterField(content: string, field: string, value: string): string {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return content

  const oldFrontmatter = fmMatch[1]
  const lines = oldFrontmatter.split("\n")
  const newLines: string[] = []
  let i = 0

  while (i < lines.length) {
    const fieldMatch = lines[i].match(new RegExp(`^${field}:\\s*(.*)`))
    if (fieldMatch) {
      // Replace this field with single-line value
      newLines.push(`${field}: ${value}`)
      const inlineVal = fieldMatch[1].trim()
      // Skip block scalar continuation lines
      if (!inlineVal || ["|-", ">-", "|", ">"].includes(inlineVal)) {
        i++
        while (i < lines.length && /^\s+/.test(lines[i])) {
          i++
        }
        continue
      }
    } else {
      newLines.push(lines[i])
    }
    i++
  }

  const newFrontmatter = newLines.join("\n")
  return content.replace(fmMatch[0], `---\n${newFrontmatter}\n---`)
}

export function WorkspaceSkillPreview({ data, skillId, onRegenerate, onSuccess }: WorkspaceSkillPreviewProps) {
  const isNew = !skillId

  const [content, setContent] = useState(data.content)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const parsed = useMemo(() => extractFrontmatter(content), [content])

  const startEdit = useCallback((field: string) => {
    setEditingField(field)
    setStatus("idle")
  }, [])

  const confirmEdit = useCallback(() => {
    setEditingField(null)
  }, [])

  const handleFieldChange = useCallback((field: string, value: string) => {
    setContent(prev => updateFrontmatterField(prev, field, value))
  }, [])

  const handleContentChange = useCallback((val: string) => {
    setContent(val)
    setStatus("idle")
  }, [])

  const handleSave = async () => {
    if (!content.trim()) {
      setStatus("error")
      setMessage("Skill-Inhalt darf nicht leer sein.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const url = isNew ? "/api/user/skills" : `/api/user/skills/${skillId}`
      const method = isNew ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      const responseData = await res.json()

      if (res.ok) {
        setStatus("success")
        setMessage(isNew ? "Quicktask erstellt." : "Quicktask aktualisiert.")
        setTimeout(onSuccess, 800)
      } else if (res.status === 409) {
        setStatus("error")
        setMessage("Ein Skill mit diesem Slug existiert bereits. Bitte den Namen anpassen.")
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
        value={parsed.name}
        editing={editingField === "name"}
        onStartEdit={() => startEdit("name")}
        onConfirmEdit={confirmEdit}
        renderEdit={() => (
          <Input
            value={parsed.name}
            onChange={(e) => handleFieldChange("name", e.target.value)}
            maxLength={100}
            autoFocus
          />
        )}
      />

      {/* Slug */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Slug</Label>
        <p className="text-sm">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{parsed.slug}</code>
        </p>
      </div>

      {/* Description */}
      <PreviewField
        label="Beschreibung"
        value={parsed.description}
        editing={editingField === "description"}
        onStartEdit={() => startEdit("description")}
        onConfirmEdit={confirmEdit}
        renderEdit={() => (
          <Input
            value={parsed.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            maxLength={500}
            autoFocus
          />
        )}
      />

      {/* Quicktask Info */}
      {parsed.mode === "quicktask" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            {parsed.category && (
              <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {parsed.category}
              </span>
            )}
            {parsed.icon && (
              <span className="text-xs text-muted-foreground">
                Icon: {parsed.icon}
              </span>
            )}
          </div>

          {/* Fields (read-only) */}
          {parsed.fields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Formular-Felder</Label>
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                {parsed.fields.map((f) => (
                  <div key={f.key} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono">{f.type}</span>
                    <div className="min-w-0">
                      <span className="font-medium">{f.label}</span>
                      {f.required && <span className="ml-1 text-destructive">*</span>}
                      {f.placeholder && (
                        <p className="text-muted-foreground truncate">{f.placeholder}</p>
                      )}
                      {f.options && f.options.length > 0 && (
                        <p className="text-muted-foreground">{f.options.join(" · ")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skill Content */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{parsed.mode === "quicktask" ? "Anweisungen" : "Skill-Inhalt (SKILL.md)"}</Label>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => editingField === "content" ? confirmEdit() : startEdit("content")}
          >
            {editingField === "content" ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
          </Button>
        </div>
        {editingField === "content" ? (
          <MarkdownEditor value={content} onChange={handleContentChange} />
        ) : (
          <pre className="max-h-[400px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs leading-relaxed">
            {parsed.body.trim()}
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

