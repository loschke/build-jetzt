import { nanoid } from "nanoid"
import { auth } from "@ai-sdk/mcp"

import { requireAuth } from "@/lib/api-guards"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { isAllowedUrl } from "@/lib/url-validation"
import { getErrorMessage } from "@/lib/errors"
import {
  isOAuthMcpAvailable,
  getActiveOAuthServer,
  resolveServerUrl,
  resolveCallbackUrl,
  decryptServerClientSecret,
} from "@/lib/mcp/oauth-connections"
import { MCPOAuthProvider } from "@/lib/mcp/oauth-provider"
import { pruneExpiredMcpOauthSessions } from "@/lib/db/queries/mcp-oauth-sessions"

/**
 * POST /api/user/mcp-connections/[serverId]/initiate
 * Startet den OAuth-Flow: registriert (lazy) den DCR-Client, legt eine PKCE-Session an
 * und gibt die Authorization-URL zurück. Das Frontend macht damit einen Top-Level-Redirect.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> }
) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const userId = authResult.user.id

  const rateCheck = checkRateLimit(userId, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  if (!isOAuthMcpAvailable()) {
    return Response.json({ error: "OAuth-MCP ist nicht verfügbar." }, { status: 404 })
  }

  const { serverId } = await params
  const server = await getActiveOAuthServer(serverId)
  if (!server) {
    return Response.json({ error: "Server nicht gefunden." }, { status: 404 })
  }

  const serverUrl = resolveServerUrl(server.url)
  if (!isAllowedUrl(serverUrl)) {
    return Response.json({ error: "Server-URL nicht erlaubt." }, { status: 400 })
  }

  // Best-effort: abgelaufene Sessions aufräumen (nie blockierend).
  try {
    await pruneExpiredMcpOauthSessions()
  } catch {
    // ignore
  }

  const stateNonce = nanoid(24)
  const provider = new MCPOAuthProvider({
    mode: "initiate",
    userId,
    serverId,
    callbackUrl: resolveCallbackUrl(request),
    scopes: server.oauthScopes,
    stateNonce,
    clientId: server.oauthClientId,
    clientSecret: decryptServerClientSecret(server.oauthClientSecretEnc),
  })

  try {
    const result = await auth(provider, { serverUrl })
    if (result !== "REDIRECT" || !provider.capturedAuthUrl) {
      return Response.json(
        { error: "OAuth-Flow konnte nicht gestartet werden." },
        { status: 502 }
      )
    }
    return Response.json({ authorizationUrl: provider.capturedAuthUrl.toString() })
  } catch (error) {
    // Niemals Secrets/Header loggen — nur die Fehlermeldung.
    console.warn(`[MCP-OAuth] initiate failed for ${serverId}:`, getErrorMessage(error))
    return Response.json(
      { error: "Verbindung zum Anbieter fehlgeschlagen." },
      { status: 502 }
    )
  }
}
