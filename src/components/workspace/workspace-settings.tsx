"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

const MAX_LENGTH = 2000

interface ModelInfo {
  id: string
  name: string
  provider: string
}

export function WorkspaceSettings() {
  const [instructions, setInstructions] = useState("")
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [memoryAvailable, setMemoryAvailable] = useState(false)
  const [suggestedRepliesEnabled, setSuggestedRepliesEnabled] = useState(true)
  const [creditsBalance, setCreditsBalance] = useState<number | undefined>(undefined)
  const [creditsEnabled, setCreditsEnabled] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [prefsRes, modelsRes] = await Promise.all([
        fetch("/api/user/instructions"),
        fetch("/api/models"),
      ])
      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setInstructions(data.instructions ?? "")
        setDefaultModelId(data.defaultModelId ?? null)
        setMemoryEnabled(data.memoryEnabled ?? true)
        setMemoryAvailable(data.memoryAvailable ?? false)
        setSuggestedRepliesEnabled(data.suggestedRepliesEnabled ?? true)
        setCreditsBalance(data.creditsBalance)
        setCreditsEnabled(data.creditsEnabled ?? false)
      }
      if (modelsRes.ok) {
        const data = await modelsRes.json()
        setModels(data.models ?? [])
      }
    } catch {
      // non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async () => {
    setStatus("saving")
    setMessage("")

    try {
      const res = await fetch("/api/user/instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: instructions || null,
          defaultModelId,
          memoryEnabled,
          suggestedRepliesEnabled,
        }),
      })

      if (res.ok) {
        setStatus("success")
        setMessage("Einstellungen gespeichert.")
        setTimeout(() => setStatus("idle"), 2000)
      } else {
        setStatus("error")
        setMessage("Speichern fehlgeschlagen.")
      }
    } catch {
      setStatus("error")
      setMessage("Netzwerkfehler. Bitte erneut versuchen.")
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Lade Einstellungen...</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">Einstellungen</h1>

      <div className="space-y-2">
        <Label htmlFor="custom-instructions">Custom Instructions</Label>
        <Textarea
          id="custom-instructions"
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); setStatus("idle") }}
          placeholder="Gib der KI zusaetzliche Anweisungen die in jedem Chat gelten..."
          className="min-h-[150px]"
          maxLength={MAX_LENGTH}
        />
        <p className="text-xs text-muted-foreground">{instructions.length}/{MAX_LENGTH} Zeichen</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default-model">Standard-Modell</Label>
        <Select
          value={defaultModelId ?? "__default__"}
          onValueChange={(val) => { setDefaultModelId(val === "__default__" ? null : val); setStatus("idle") }}
        >
          <SelectTrigger id="default-model">
            <SelectValue placeholder="System-Standard" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">System-Standard</SelectItem>
            {models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {memoryAvailable && (
        <div className="flex items-center gap-3">
          <Switch
            id="memory-toggle"
            checked={memoryEnabled}
            onCheckedChange={(val) => { setMemoryEnabled(val); setStatus("idle") }}
          />
          <Label htmlFor="memory-toggle" className="text-sm">
            Memory — KI merkt sich Informationen ueber Gespraeche hinweg
          </Label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Switch
          id="suggested-replies"
          checked={suggestedRepliesEnabled}
          onCheckedChange={(val) => { setSuggestedRepliesEnabled(val); setStatus("idle") }}
        />
        <Label htmlFor="suggested-replies" className="text-sm">
          Antwortvorschlaege nach jeder KI-Nachricht anzeigen
        </Label>
      </div>

      {creditsEnabled && creditsBalance !== undefined && (
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Credits</p>
          <p className="text-2xl font-bold">{creditsBalance.toLocaleString("de-DE")}</p>
          <p className="text-xs text-muted-foreground">Verfuegbares Guthaben</p>
        </div>
      )}

      {message && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          status === "success" ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
        }`}>
          {status === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {message}
        </div>
      )}

      <Button onClick={handleSave} disabled={status === "saving"}>
        {status === "saving" ? "Speichere..." : "Speichern"}
      </Button>
    </div>
  )
}
