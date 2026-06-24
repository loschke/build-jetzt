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

export type AppHostError = "server_not_found" | "not_connected" | "tool_not_allowed" | "connect_failed"

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
): Promise<{ contents: UiResourceContent[] } | { error: AppHostError }> {
  if (!uri.startsWith("ui://")) return { error: "server_not_found" }
  const r = await resolveServer(userId, serverId)
  if (!r.ok) return { error: r.error }

  const conn = await connectMcpClient(r.config, r.authProvider)
  if (!conn) return { error: "connect_failed" }
  try {
    const result = await conn.client.readResource({ uri })
    const contents: UiResourceContent[] = (result.contents ?? []).map((c) => ({
      uri: typeof c.uri === "string" ? c.uri : uri,
      mimeType: typeof c.mimeType === "string" ? c.mimeType : undefined,
      text: typeof (c as { text?: unknown }).text === "string" ? (c as { text: string }).text : undefined,
      meta: ((c as { _meta?: Record<string, unknown> })._meta) ?? undefined,
    }))
    return { contents }
  } catch (error) {
    console.warn(`[MCP-App] readResource failed for ${serverId}:`, getErrorMessage(error))
    return { error: "connect_failed" }
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
): Promise<{ result: unknown } | { error: AppHostError }> {
  const r = await resolveServer(userId, serverId)
  if (!r.ok) return { error: r.error }

  // Honor the server's tool allowlist (capability gating).
  if (r.config.enabledTools && !r.config.enabledTools.includes(toolName)) {
    return { error: "tool_not_allowed" }
  }

  const conn = await connectMcpClient(r.config, r.authProvider)
  if (!conn) return { error: "connect_failed" }
  try {
    const tools = await conn.client.tools()
    const tool = tools[toolName]
    if (!tool || typeof tool.execute !== "function") {
      return { error: "tool_not_allowed" }
    }
    const result = await Promise.race([
      tool.execute(args, { toolCallId: "mcp-app", messages: [] }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("app tool-call timeout")), APP_CALL_TIMEOUT)
      ),
    ])
    return { result }
  } catch (error) {
    console.warn(`[MCP-App] tool-call ${serverId}/${toolName} failed:`, getErrorMessage(error))
    return { error: "connect_failed" }
  } finally {
    conn.close().catch(() => {})
  }
}
