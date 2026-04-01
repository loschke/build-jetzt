"use client"

import { Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface PreviewFieldProps {
  label: string
  value: string
  editing: boolean
  onStartEdit: () => void
  onConfirmEdit: () => void
  renderEdit: () => React.ReactNode
}

export function PreviewField({ label, value, editing, onStartEdit, onConfirmEdit, renderEdit }: PreviewFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={editing ? onConfirmEdit : onStartEdit}
        >
          {editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
        </Button>
      </div>
      {editing ? renderEdit() : (
        <p className="text-sm">{value}</p>
      )}
    </div>
  )
}
