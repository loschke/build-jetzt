/**
 * Helfer für den OAuth-MCP-Connect-Flow (Settings/API-seitig).
 * Gate, Server-Auflösung und Status-Ableitung — getrennt vom Chat-Pfad.
 */

import { features } from "@/config/features"
import { resolveEnvVars } from "@/config/mcp"
import { isMcpTokenEncryptionConfigured, decryptSecret } from "@/lib/crypto/mcp-tokens"
import { getActiveMcpServers, getMcpServerByServerId } from "@/lib/db/queries/mcp-servers"

/** OAuth-MCP ist nur verfügbar, wenn MCP aktiv UND ein Encryption-Key konfiguriert ist (fail-closed). */
export function isOAuthMcpAvailable(): boolean {
  return features.mcp.enabled && isMcpTokenEncryptionConfigured()
}

/** Verbindungsstatus für die Settings-Anzeige. */
export type OAuthConnectionStatus = "connected" | "expired" | "not-connected"

export function deriveConnectionStatus(
  connection: { status: string } | null | undefined
): OAuthConnectionStatus {
  if (!connection) return "not-connected"
  return connection.status === "expired" ? "expired" : "connected"
}

/** Aktive OAuth-Server (authType="oauth"). */
export async function listActiveOAuthServers() {
  const servers = await getActiveMcpServers()
  return servers.filter((s) => s.authType === "oauth")
}

/** Einzelner aktiver OAuth-Server per Slug, oder null. */
export async function getActiveOAuthServer(serverId: string) {
  const server = await getMcpServerByServerId(serverId)
  if (!server || !server.isActive || server.authType !== "oauth") return null
  return server
}

/** Aufgelöste Server-URL (${VAR}-Platzhalter), für auth()/Connect. */
export function resolveServerUrl(url: string): string {
  return resolveEnvVars(url)
}

/**
 * Feste OAuth-Callback-URL. Bevorzugt APP_BASE_URL (Prod, stabil), sonst Request-Origin (Dev).
 * Muss bei Initiate (DCR-Registrierung) und Callback (Code-Tausch) identisch sein.
 */
export function resolveCallbackUrl(request: Request): string {
  const base = process.env.APP_BASE_URL ?? new URL(request.url).origin
  return `${base.replace(/\/$/, "")}/api/user/mcp-connections/callback`
}

/**
 * Callback-URL ohne Request-Kontext (Chat-Zeit). Nutzt APP_BASE_URL, sonst localhost-Fallback.
 * Zur Chat-Zeit wird sie real nie für einen Redirect verwendet (der Provider wirft vorher),
 * muss aber für clientMetadata/redirectUrl ein valider String sein.
 */
export function getConfiguredCallbackUrl(): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/api/user/mcp-connections/callback`
}

/** Entschlüsselt das DCR-Client-Secret eines Servers (oder null). */
export function decryptServerClientSecret(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  return decryptSecret(encrypted)
}
