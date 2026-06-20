/**
 * Chat-Zeit-Auflösung der OAuth-MCP-Server für einen User.
 *
 * Trennt die OAuth-Server vom statischen Pfad und baut pro verbundenem Server einen
 * ChatTime-`MCPOAuthProvider`. Provider werden PRO REQUEST gebaut und NIE gecacht
 * (kein Cross-User-Leak). Server ohne aktive Verbindung werden bewusst weggelassen,
 * damit der Chat nicht erfolglos gegen unverbundene OAuth-Server connectet (5s-Timeout).
 */

import type { OAuthClientProvider, OAuthTokens } from "@ai-sdk/mcp"

import type { MCPServerConfig } from "@/config/mcp"
import { decryptSecret } from "@/lib/crypto/mcp-tokens"
import { getErrorMessage } from "@/lib/errors"
import { isOAuthMcpAvailable, getConfiguredCallbackUrl } from "@/lib/mcp/oauth-connections"
import { MCPOAuthProvider } from "@/lib/mcp/oauth-provider"
import { getUserMcpConnections } from "@/lib/db/queries/user-mcp-connections"

export interface ResolvedChatMcp {
  /** Zu verbindende Server (statische + verbundene OAuth-Server). */
  servers: MCPServerConfig[]
  /** Per-Server OAuth-Provider (nur OAuth-Server). */
  authProviders: Map<string, OAuthClientProvider>
}

type ConnectionRow = {
  serverId: string
  accessTokenEnc: string
  refreshTokenEnc: string | null
  tokenType: string | null
  expiresAt: Date | null
  scope: string | null
  status: string
}

/** Rekonstruiert die OAuthTokens-Struktur aus einer (entschlüsselten) Connection-Zeile. */
function toOAuthTokens(conn: ConnectionRow): OAuthTokens {
  const expiresIn =
    conn.expiresAt != null
      ? Math.max(0, Math.floor((conn.expiresAt.getTime() - Date.now()) / 1000))
      : undefined
  return {
    access_token: decryptSecret(conn.accessTokenEnc),
    token_type: conn.tokenType ?? "Bearer",
    refresh_token: conn.refreshTokenEnc ? decryptSecret(conn.refreshTokenEnc) : undefined,
    scope: conn.scope ?? undefined,
    expires_in: expiresIn,
  }
}

/**
 * Teilt die Server in statisch + OAuth und baut für jeden verbundenen OAuth-Server
 * einen ChatTime-Provider. Fehlt der Encryption-Key, werden alle OAuth-Server gedroppt.
 */
export async function resolveChatMcp(
  userId: string,
  allServers: MCPServerConfig[]
): Promise<ResolvedChatMcp> {
  const staticServers = allServers.filter((s) => s.authType !== "oauth")
  const oauthServers = allServers.filter((s) => s.authType === "oauth")

  // Kein OAuth-Pfad ohne Encryption-Key (fail-closed) → nur statische Server.
  if (oauthServers.length === 0 || !isOAuthMcpAvailable()) {
    return { servers: staticServers, authProviders: new Map() }
  }

  const connections = await getUserMcpConnections(userId)
  const byServer = new Map(connections.map((c) => [c.serverId, c]))

  const includedOauth: MCPServerConfig[] = []
  const authProviders = new Map<string, OAuthClientProvider>()
  const callbackUrl = getConfiguredCallbackUrl()

  for (const server of oauthServers) {
    const conn = byServer.get(server.id)
    // Nur aktive Verbindungen einbinden. "expired" → User muss neu verbinden.
    if (!conn || conn.status !== "active") continue

    try {
      const provider = new MCPOAuthProvider({
        mode: "chat",
        userId,
        serverId: server.id,
        callbackUrl,
        scopes: server.oauthScopes,
        stateNonce: "",
        clientId: server.oauthClientId,
        clientSecret: server.oauthClientSecretEnc
          ? decryptSecret(server.oauthClientSecretEnc)
          : null,
        storedTokens: toOAuthTokens(conn),
      })
      authProviders.set(server.id, provider)
      includedOauth.push(server)
    } catch (error) {
      // Entschlüsselung fehlgeschlagen o. Ä. → Server still weglassen, Chat läuft weiter.
      console.warn(
        `[MCP-OAuth] skip server ${server.id} for chat:`,
        getErrorMessage(error)
      )
    }
  }

  return { servers: [...staticServers, ...includedOauth], authProviders }
}
