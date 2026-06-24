/**
 * MCP Apps host — server-side operations (Ebene B / M2.2).
 *
 * Two fresh-per-call operations the sandboxed widget needs, both routed over the
 * user's OWN authenticated MCP connection (never another user's, never a cached
 * handle):
 *   - readUiResource  → reads the `ui://` HTML resource for rendering
 *   - callAppTool     → proxies an app-initiated `tools/call` (e.g. job_status poll)
 *
 * Each call resolves the single server config (with env-gate), builds the per-user
 * OAuth provider via resolveChatMcp, connects, runs, and closes. No pooling.
 * Capability gating is structural: we only ever connect to the ONE server the
 * widget belongs to, and honor that server's `enabledTools` allowlist.
 */

import "server-only"

import type { OAuthClientProvider } from "@ai-sdk/mcp"

import type { MCPServerConfig } from "@/config/mcp"
import { getActiveMCPServersForExpert } from "@/config/mcp"
import { resolveChatMcp } from "@/lib/mcp/chat-oauth"
import { connectMcpClient } from "@/lib/mcp"
import { getErrorMessage } from "@/lib/errors"

const APP_CALL_TIMEOUT = 30_000
const DEBUG = process.env.NEXT_PUBLIC_MCP_APPS_DEBUG === "true"

export type AppHostError =
  | "server_not_found"
  | "not_connected"
  | "tool_not_allowed"
  | "tool_not_found"
  | "timeout"
  | "connect_failed"

/** Structured diagnostics. Failures always warn; timing/ok only under debug flag. */
function log(op: string, fields: Record<string, unknown>) {
  if (!op.endsWith(".fail") && !DEBUG) return
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
  const msg = `[MCP-App] ${op} ${parts.join(" ")}`
  if (op.endsWith(".fail")) console.warn(msg)
  else console.info(msg)
}

/** Strip URLs and cap length before returning an error detail to the client. */
function safeDetail(msg: string): string {
  return msg.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 200)
}

type ResolveResult =
  | { ok: true; config: MCPServerConfig; authProvider?: OAuthClientProvider }
  | { ok: false; error: AppHostError }

/**
 * Resolve a single server for this user: applies env-gate + (for OAuth servers)
 * requires an active connection.
 */
async function resolveServer(userId: string, serverId: string): Promise<ResolveResult> {
  const configs = await getActiveMCPServersForExpert([serverId])
  const config = configs.find((c) => c.id === serverId)
  if (!config) return { ok: false, error: "server_not_found" }

  const { servers, authProviders } = await resolveChatMcp(userId, [config])
  // OAuth server without an active connection is dropped by resolveChatMcp.
  const resolved = servers.find((s) => s.id === serverId)
  if (!resolved) return { ok: false, error: "not_connected" }

  return { ok: true, config: resolved, authProvider: authProviders.get(serverId) }
}

export interface UiResourceContent {
  uri: string
  mimeType?: string
  text?: string
  /** Resource `_meta` carries MCP Apps csp/permissions (read here, applied by the host). */
  meta?: Record<string, unknown>
}

/** Read a `ui://` resource (the widget HTML) over the user's connection. */
export async function readUiResource(
  userId: string,
  serverId: string,
  uri: string
): Promise<{ contents: UiResourceContent[] } | { error: AppHostError; detail?: string }> {
  if (!uri.startsWith("ui://")) return { error: "server_not_found", detail: "uri must start with ui://" }
  const t0 = Date.now()
  const r = await resolveServer(userId, serverId)
  if (!r.ok) {
    log("readResource.resolve", { server: serverId, error: r.error })
    return { error: r.error }
  }

  const tConnect = Date.now()
  const conn = await connectMcpClient(r.config, r.authProvider)
  if (!conn) {
    log("readResource.connect", { server: serverId, error: "connect_failed", connectMs: Date.now() - tConnect })
    return { error: "connect_failed", detail: "could not connect to server" }
  }
  try {
    const tRead = Date.now()
    const result = await conn.client.readResource({ uri })
    const contents: UiResourceContent[] = (result.contents ?? []).map((c) => ({
      uri: typeof c.uri === "string" ? c.uri : uri,
      mimeType: typeof c.mimeType === "string" ? c.mimeType : undefined,
      text: typeof (c as { text?: unknown }).text === "string" ? (c as { text: string }).text : undefined,
      meta: ((c as { _meta?: Record<string, unknown> })._meta) ?? undefined,
    }))
    log("readResource.ok", {
      server: serverId,
      uri,
      connectMs: tRead - tConnect,
      readMs: Date.now() - tRead,
      totalMs: Date.now() - t0,
      bytes: contents[0]?.text?.length ?? 0,
    })
    return { contents }
  } catch (error) {
    const detail = getErrorMessage(error)
    log("readResource.fail", { server: serverId, uri, totalMs: Date.now() - t0, detail })
    return { error: "connect_failed", detail: safeDetail(detail) }
  } finally {
    conn.close().catch(() => {})
  }
}

/**
 * Proxy an app-initiated tool call. `toolName` is the server-LOCAL name (e.g.
 * "job_status"), since the widget calls its own server's tools directly.
 */
export async function callAppTool(
  userId: string,
  serverId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ result: unknown } | { error: AppHostError; detail?: string }> {
  const t0 = Date.now()
  const r = await resolveServer(userId, serverId)
  if (!r.ok) {
    log("callTool.resolve", { server: serverId, tool: toolName, error: r.error })
    return { error: r.error }
  }

  // Honor the server's tool allowlist (capability gating).
  if (r.config.enabledTools && !r.config.enabledTools.includes(toolName)) {
    log("callTool.gated", { server: serverId, tool: toolName })
    return { error: "tool_not_allowed", detail: `tool not in allowlist: ${toolName}` }
  }

  const tConnect = Date.now()
  const conn = await connectMcpClient(r.config, r.authProvider)
  if (!conn) {
    log("callTool.connect", { server: serverId, tool: toolName, error: "connect_failed", connectMs: Date.now() - tConnect })
    return { error: "connect_failed", detail: "could not connect to server" }
  }
  try {
    const tTools = Date.now()
    const tools = await conn.client.tools()
    const tExec = Date.now()
    const tool = tools[toolName]
    if (!tool || typeof tool.execute !== "function") {
      log("callTool.missing", { server: serverId, tool: toolName, available: Object.keys(tools).length })
      return { error: "tool_not_found", detail: `tool not found on server: ${toolName}` }
    }
    const result = await Promise.race([
      tool.execute(args, { toolCallId: "mcp-app", messages: [] }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`app tool-call timeout after ${APP_CALL_TIMEOUT}ms`)), APP_CALL_TIMEOUT)
      ),
    ])
    log("callTool.ok", {
      server: serverId,
      tool: toolName,
      connectMs: tTools - tConnect,
      listMs: tExec - tTools,
      execMs: Date.now() - tExec,
      totalMs: Date.now() - t0,
    })
    return { result }
  } catch (error) {
    const detail = getErrorMessage(error)
    const isTimeout = error instanceof Error && /tool-call timeout/.test(error.message)
    log("callTool.fail", { server: serverId, tool: toolName, totalMs: Date.now() - t0, detail })
    return { error: isTimeout ? "timeout" : "connect_failed", detail: safeDetail(detail) }
  } finally {
    conn.close().catch(() => {})
  }
}
