"use client"

import { useEffect, useRef, useState } from "react"
import { AppBridge, PostMessageTransport, buildAllowAttribute } from "@modelcontextprotocol/ext-apps/app-bridge"
import type { McpUiResourcePermissions } from "@modelcontextprotocol/ext-apps/app-bridge"

/**
 * MCP Apps host frame (Ebene B / M2.3).
 *
 * Loads a `ui://` widget's HTML over the user's connection (POST /api/mcp/app-resource),
 * renders it in a STRICT sandbox iframe (allow-scripts, NO allow-same-origin → opaque
 * origin, no host DOM/cookie access), and drives it with the official AppBridge.
 * App-initiated tool calls are proxied to POST /api/mcp/app-call (the user's own
 * authenticated connection). Host advertises MINIMAL capabilities (serverTools +
 * logging + open/download) — no sampling/subscribe — so widgets degrade to polling.
 */

export interface McpAppFrameProps {
  /** MCP server id (prefix before "__" in the tool name). */
  serverId: string
  /** ui:// resource URI from the tool's _meta.ui.resourceUri. */
  resourceUri: string
  /** The arguments the tool was called with (pushed to the widget). */
  toolInput?: unknown
  /** The tool result (pushed to the widget; it polls onward itself). */
  toolOutput?: unknown
  theme?: "light" | "dark"
}

const HOST_INFO = { name: "build-jetzt", version: "1.0.0" } as const

const MINIMAL_CAPS = {
  serverTools: { listChanged: false },
  logging: {},
  openLinks: {},
  downloadFile: {},
} as const

/** Strip any existing CSP and inject a tight one for the self-contained widget. */
function injectWidgetCsp(html: string, resourceDomains: string[], connectDomains: string[]): string {
  const res = ["data:", "blob:", "https:", ...resourceDomains].join(" ")
  const connect = connectDomains.length ? connectDomains.join(" ") : "'none'"
  const csp =
    `<meta http-equiv="Content-Security-Policy" content="` +
    `default-src 'none'; script-src 'unsafe-inline' ${res}; style-src 'unsafe-inline' ${res}; ` +
    `img-src ${res}; media-src ${res}; font-src ${res}; connect-src ${connect};">`
  const stripped = html.replace(/<meta\s+http-equiv\s*=\s*["']Content-Security-Policy["'][^>]*>/gi, "")
  const headMatch = stripped.match(/<head(\s[^>]*)?>/i)
  if (headMatch && headMatch.index != null) {
    const at = headMatch.index + headMatch[0].length
    return stripped.slice(0, at) + csp + stripped.slice(at)
  }
  return csp + stripped
}

export function McpAppFrame({ serverId, resourceUri, toolInput, toolOutput, theme = "dark" }: McpAppFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const bridgeRef = useRef<AppBridge | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string>("")
  const [height, setHeight] = useState(120)

  useEffect(() => {
    let cancelled = false
    const iframe = iframeRef.current
    if (!iframe) return

    async function boot() {
      try {
        // 1. Read the ui:// resource (HTML + optional csp/permissions meta).
        const res = await fetch("/api/mcp/app-resource", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ serverId, uri: resourceUri }),
        })
        if (!res.ok) throw new Error(`resource ${res.status}`)
        const { contents } = (await res.json()) as {
          contents: Array<{ text?: string; meta?: Record<string, unknown> }>
        }
        const content = contents?.[0]
        if (!content?.text) throw new Error("leere UI-Resource")
        if (cancelled || !iframeRef.current) return

        const ui = (content.meta?.ui ?? {}) as {
          csp?: { resourceDomains?: string[]; connectDomains?: string[] }
          permissions?: McpUiResourcePermissions
        }
        const allow = buildAllowAttribute(ui.permissions)
        if (allow) iframeRef.current.setAttribute("allow", allow)
        iframeRef.current.setAttribute("sandbox", "allow-scripts")
        iframeRef.current.srcdoc = injectWidgetCsp(
          content.text,
          ui.csp?.resourceDomains ?? [],
          ui.csp?.connectDomains ?? []
        )

        // 2. Wait for the iframe document to load.
        await new Promise<void>((resolve) => {
          iframeRef.current?.addEventListener("load", () => resolve(), { once: true })
        })
        if (cancelled || !iframeRef.current?.contentWindow) return

        // 3. Wire the bridge with minimal host capabilities.
        const bridge = new AppBridge(null, HOST_INFO, MINIMAL_CAPS, {
          hostContext: {
            theme,
            displayMode: "inline",
            availableDisplayModes: ["inline", "fullscreen"],
            platform: "web",
          },
        })
        bridgeRef.current = bridge

        bridge.oncalltool = async (params) => {
          const r = await fetch("/api/mcp/app-call", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ serverId, toolName: params.name, arguments: params.arguments ?? {} }),
          })
          if (!r.ok) throw new Error(`tool-call ${r.status}`)
          const { result } = (await r.json()) as { result: unknown }
          return result as Awaited<ReturnType<AppBridge["callTool"]>>
        }
        bridge.onopenlink = async ({ url }) => {
          if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer")
          return {}
        }
        bridge.ondownloadfile = async () => ({})
        bridge.onrequestdisplaymode = async ({ mode }) => ({ mode })
        bridge.addEventListener("sizechange", ({ height: h }) => {
          if (typeof h === "number" && h > 0) setHeight(Math.min(Math.max(h, 80), 1600))
        })

        bridge.addEventListener("initialized", () => {
          bridge
            .sendToolInput({ arguments: (toolInput ?? {}) as Record<string, unknown> })
            .then(() =>
              bridge.sendToolResult(
                (toolOutput ?? { content: [] }) as Parameters<AppBridge["sendToolResult"]>[0]
              )
            )
            .catch(() => {})
        })

        await bridge.connect(new PostMessageTransport(iframeRef.current.contentWindow, iframeRef.current.contentWindow))
        if (!cancelled) setStatus("ready")
      } catch (err) {
        if (cancelled) return
        setErrorMsg(err instanceof Error ? err.message : "Widget konnte nicht geladen werden")
        setStatus("error")
      }
    }

    boot()

    return () => {
      cancelled = true
      const bridge = bridgeRef.current
      bridgeRef.current = null
      if (bridge) {
        bridge.teardownResource({}).catch(() => {})
      }
    }
    // Re-mount the widget if the server/resource identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverId, resourceUri])

  return (
    <div className="overflow-hidden rounded-xl border widget-card">
      {status === "error" ? (
        <div className="p-3 text-sm text-muted-foreground">
          MCP-Widget nicht verfügbar{errorMsg ? ` (${errorMsg})` : ""}.
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          title="MCP App"
          className="block w-full bg-background"
          style={{ height, border: 0 }}
        />
      )}
    </div>
  )
}
