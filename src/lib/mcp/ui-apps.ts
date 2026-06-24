/**
 * MCP Apps (SEP-1865) host helpers — Ebene B / M2.
 *
 * Pure, dependency-free utilities for detecting a tool's UI resource and the
 * MCP Apps mime profile. The tool's `_meta.ui.resourceUri` (nested, preferred)
 * or `_meta["ui/resourceUri"]` (deprecated flat) points at a `ui://` resource
 * the host reads via `resources/read` and renders in a sandboxed iframe.
 *
 * Kept free of `@modelcontextprotocol/ext-apps` imports so it is safe to use on
 * both server (build-tools, proxy route) and client without pulling the SDK in.
 */

/** MIME type that marks a UI resource as an MCP App. */
export const MCP_APP_MIME = "text/html;profile=mcp-app"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

/**
 * Extract the `ui://` resource URI from a tool's `_meta`, if any.
 * Supports the nested `_meta.ui.resourceUri` form and the deprecated flat
 * `_meta["ui/resourceUri"]` form (nested wins). Returns undefined unless the
 * value is a well-formed `ui://` URI.
 */
export function getMcpUiResourceUri(meta: unknown): string | undefined {
  if (!isRecord(meta)) return undefined

  // Nested (preferred): _meta.ui.resourceUri
  const ui = meta.ui
  if (isRecord(ui) && typeof ui.resourceUri === "string") {
    return normalizeUiUri(ui.resourceUri)
  }

  // Flat (deprecated): _meta["ui/resourceUri"]
  const flat = meta["ui/resourceUri"]
  if (typeof flat === "string") {
    return normalizeUiUri(flat)
  }

  return undefined
}

function normalizeUiUri(uri: string): string | undefined {
  return uri.startsWith("ui://") ? uri : undefined
}

/** True when a tool declares an MCP Apps UI resource. */
export function hasMcpUi(meta: unknown): boolean {
  return getMcpUiResourceUri(meta) !== undefined
}

/** True when a `resources/read` content mimeType marks an MCP App resource. */
export function isMcpAppMime(mimeType: unknown): boolean {
  return typeof mimeType === "string" && mimeType.split(";")[0].trim() === "text/html"
    && /profile\s*=\s*mcp-app/.test(mimeType)
}
