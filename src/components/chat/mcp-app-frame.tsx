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
    let initWatch: ReturnType<typeof setTimeout> | undefined
    const iframe = iframeRef.current
    if (!iframe) return

    const t0 = Date.now()
    // Diagnostics: every phase lands in window.__MCP_APP_LOG (copy/paste) + console.
    const dbg = (phase: string, extra?: Record<string, unknown>) => {
      const entry = { t: Date.now() - t0, server: serverId, phase, ...extra }
      const w = window as unknown as { __MCP_APP_LOG?: unknown[] }
      ;(w.__MCP_APP_LOG ??= []).push(entry)
      console.info(`[McpApp +${entry.t}ms] ${phase}`, extra ?? "")
    }

    async function boot() {
      try {
        dbg("boot", { resourceUri })
        // 1. Read the ui:// resource (HTML + optional csp/permissions meta).
        const res = await fetch("/api/mcp/app-resource", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ serverId, uri: resourceUri }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
          dbg("resource.fail", { status: res.status, error: body.error, detail: body.detail })
          throw new Error(`Resource ${res.status}: ${body.detail ?? body.error ?? ""}`)
        }
        const { contents } = (await res.json()) as {
          contents: Array<{ text?: string; meta?: Record<string, unknown> }>
        }
        const content = contents?.[0]
        if (!content?.text) throw new Error("leere UI-Resource")
        dbg("resource.ok", { bytes: content.text.length })
        if (cancelled || !iframeRef.current) return

        const ui = (content.meta?.ui ?? {}) as {
          csp?: { resourceDomains?: string[]; connectDomains?: string[] }
          permissions?: McpUiResourcePermissions
        }
        const frame = iframeRef.current
        const win = frame.contentWindow
        if (!win) throw new Error("iframe ohne contentWindow")

        // 2. Sandbox + permissions BEFORE the widget content loads.
        const allow = buildAllowAttribute(ui.permissions)
        if (allow) frame.setAttribute("allow", allow)
        frame.setAttribute("sandbox", "allow-scripts")

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
          const ts = Date.now()
          dbg("calltool→", { tool: params.name })
          const r = await fetch("/api/mcp/app-call", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ serverId, toolName: params.name, arguments: params.arguments ?? {} }),
          })
          if (!r.ok) {
            const body = (await r.json().catch(() => ({}))) as { error?: string; detail?: string }
            dbg("calltool✗", { tool: params.name, status: r.status, error: body.error, detail: body.detail, ms: Date.now() - ts })
            throw new Error(`tool-call ${r.status}: ${body.detail ?? body.error ?? ""}`)
          }
          const { result } = (await r.json()) as { result: { isError?: boolean } }
          dbg("calltool✓", { tool: params.name, ms: Date.now() - ts, isError: result?.isError ?? false })
          return result as Awaited<ReturnType<AppBridge["callTool"]>>
        }
        bridge.onopenlink = async ({ url }) => {
          dbg("openlink", { url })
          if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer")
          return {}
        }
        bridge.ondownloadfile = async () => ({})
        bridge.onrequestdisplaymode = async ({ mode }) => ({ mode })
        bridge.addEventListener("sizechange", ({ height: h }) => {
          if (typeof h === "number" && h > 0) setHeight(Math.min(Math.max(h, 80), 1600))
        })

        bridge.addEventListener("initialized", () => {
          if (initWatch) clearTimeout(initWatch)
          dbg("initialized", { appCaps: bridge.getAppCapabilities(), app: bridge.getAppVersion() })
          bridge
            .sendToolInput({ arguments: (toolInput ?? {}) as Record<string, unknown> })
            .then(() =>
              bridge.sendToolResult(
                (toolOutput ?? { content: [] }) as Parameters<AppBridge["sendToolResult"]>[0]
              )
            )
            .then(() => dbg("pushed.toolInput+toolResult"))
            .catch((e) => dbg("push.fail", { detail: e instanceof Error ? e.message : String(e) }))
        })

        // Watchdog: distinguishes a stuck handshake from a stuck tool-call.
        initWatch = setTimeout(() => {
          if (!cancelled) dbg("WARN", { msg: "ui/initialize nicht empfangen nach 10s — Handshake-Race?" })
        }, 10_000)

        // 4. Connect (attach host listener) BEFORE loading the widget. Otherwise the
        // widget's ui/initialize — sent the moment its script runs — races ahead of
        // our listener and is lost, so the host never replies and the widget times out.
        frame.addEventListener("load", () => dbg("iframe.load"), { once: true })
        dbg("bridge.connect→")
        await bridge.connect(new PostMessageTransport(win, win))
        dbg("bridge.connect✓ (host listening)")
        if (cancelled) return

        // 5. Now load the widget — the host is already listening for ui/initialize.
        dbg("srcdoc.set")
        frame.srcdoc = injectWidgetCsp(
          content.text,
          ui.csp?.resourceDomains ?? [],
          ui.csp?.connectDomains ?? []
        )
        if (!cancelled) setStatus("ready")
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : "Widget konnte nicht geladen werden"
        dbg("error", { detail: msg })
        setErrorMsg(msg)
        setStatus("error")
      }
    }

    boot()

    return () => {
      cancelled = true
      if (initWatch) clearTimeout(initWatch)
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
