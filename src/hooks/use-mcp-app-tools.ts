"use client"

import { useEffect, useState } from "react"
import { features } from "@/config/features"

export interface McpAppToolEntry {
  serverId: string
  resourceUri: string
}
export type McpAppToolMap = Record<string, McpAppToolEntry>

// Module-level cache: the map is per-user and stable across chats, so all
// ChatMessage instances share a single fetch.
let cache: Promise<McpAppToolMap> | null = null

function load(): Promise<McpAppToolMap> {
  if (!cache) {
    cache = fetch("/api/mcp/app-tools")
      .then((r) => (r.ok ? r.json() : { tools: {} }))
      .then((d: { tools?: McpAppToolMap }) => d.tools ?? {})
      .catch(() => ({}))
  }
  return cache
}

/**
 * Returns the map of MCP tools that have an MCP Apps UI resource. Empty when the
 * feature is disabled. Fetches once (shared cache) the first time it is used.
 */
export function useMcpAppTools(): McpAppToolMap {
  const [map, setMap] = useState<McpAppToolMap>({})

  useEffect(() => {
    if (!features.mcpApps.enabled) return
    let active = true
    load().then((m) => {
      if (active) setMap(m)
    })
    return () => {
      active = false
    }
  }, [])

  return map
}
