"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, AlertCircle, Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "connected" | "expired" | "not-connected"

interface OAuthServer {
  serverId: string
  name: string
  description: string | null
  status: Status
}

const STATUS_LABEL: Record<Status, string> = {
  connected: "Verbunden",
  expired: "Abgelaufen",
  "not-connected": "Nicht verbunden",
}

const STATUS_CLASS: Record<Status, string> = {
  connected: "text-success",
  expired: "text-amber-600 dark:text-amber-500",
  "not-connected": "text-muted-foreground",
}

/**
 * Settings-Sektion „Externe Dienste" — OAuth-MCP-Server verbinden/trennen.
 * Rendert nichts, wenn OAuth-MCP nicht verfügbar ist (Feature-Gate).
 */
export function McpConnections() {
  const [servers, setServers] = useState<OAuthServer[]>([])
  const [available, setAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [busyServer, setBusyServer] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/user/mcp-connections")
      if (res.ok) {
        const data = await res.json()
        setAvailable(data.available ?? false)
        setServers(data.servers ?? [])
      }
    } catch {
      // non-critical
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Nach dem OAuth-Redirect zurück: ?mcp=connected|error auswerten.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const mcp = params.get("mcp")
    if (mcp === "connected") {
      setBanner({ kind: "success", text: "Dienst erfolgreich verbunden." })
    } else if (mcp === "error") {
      setBanner({ kind: "error", text: "Verbindung fehlgeschlagen. Bitte erneut versuchen." })
    }
    if (mcp) {
      params.delete("mcp")
      params.delete("server")
      const qs = params.toString()
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""))
    }
  }, [])

  const connect = async (serverId: string) => {
    setBusyServer(serverId)
    setBanner(null)
    try {
      const res = await fetch(`/api/user/mcp-connections/${serverId}/initiate`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.authorizationUrl) {
          // Top-Level-Redirect zum Anbieter-Login (kein fetch).
          window.location.href = data.authorizationUrl
          return
        }
      }
      setBanner({ kind: "error", text: "Verbindung konnte nicht gestartet werden." })
    } catch {
      setBanner({ kind: "error", text: "Netzwerkfehler. Bitte erneut versuchen." })
    } finally {
      setBusyServer(null)
    }
  }

  const disconnect = async (serverId: string) => {
    setBusyServer(serverId)
    setBanner(null)
    try {
      const res = await fetch(`/api/user/mcp-connections/${serverId}`, { method: "DELETE" })
      if (res.ok) {
        setServers((prev) =>
          prev.map((s) => (s.serverId === serverId ? { ...s, status: "not-connected" } : s))
        )
      } else {
        setBanner({ kind: "error", text: "Trennen fehlgeschlagen." })
      }
    } catch {
      setBanner({ kind: "error", text: "Netzwerkfehler. Bitte erneut versuchen." })
    } finally {
      setBusyServer(null)
    }
  }

  if (isLoading || !available || servers.length === 0) return null

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Externe Dienste</h2>
        <p className="text-xs text-muted-foreground">
          Verbinde Dienste mit deinem eigenen Konto. Die Werkzeuge stehen danach in deinen Chats zur Verfügung.
        </p>
      </div>

      {banner && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          banner.kind === "success" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        }`}>
          {banner.kind === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
          {banner.text}
        </div>
      )}

      <div className="space-y-2">
        {servers.map((s) => {
          const busy = busyServer === s.serverId
          const isConnected = s.status === "connected"
          return (
            <div key={s.serverId} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                {s.description && (
                  <p className="truncate text-xs text-muted-foreground">{s.description}</p>
                )}
                <p className={`text-xs ${STATUS_CLASS[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                  {s.status === "expired" && " — bitte neu verbinden"}
                </p>
              </div>
              {isConnected ? (
                <Button variant="outline" size="sm" disabled={busy} onClick={() => disconnect(s.serverId)}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Trennen"}
                </Button>
              ) : (
                <Button size="sm" disabled={busy} onClick={() => connect(s.serverId)}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : (
                    <><Link2 className="size-4" /> {s.status === "expired" ? "Neu verbinden" : "Verbinden"}</>
                  )}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
