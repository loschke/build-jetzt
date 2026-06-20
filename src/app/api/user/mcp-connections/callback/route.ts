import { auth } from "@ai-sdk/mcp"

import { requireAuth } from "@/lib/api-guards"
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
import {
  getMcpOauthSession,
  deleteMcpOauthSession,
} from "@/lib/db/queries/mcp-oauth-sessions"

const SETTINGS_PATH = "/workspace/settings"

function redirectToSettings(requestUrl: string, status: string, serverId?: string): Response {
  const target = new URL(SETTINGS_PATH, requestUrl)
  target.searchParams.set("mcp", status)
  if (serverId) target.searchParams.set("server", serverId)
  return Response.redirect(target, 302)
}

/**
 * GET /api/user/mcp-connections/callback
 * Geteilter OAuth-Callback. `state` (Nonce) identifiziert User+Server via DB-Session.
 * Tauscht den Code gegen Tokens (verschlüsselt gespeichert) und leitet in die Settings zurück.
 */
export async function GET(request: Request) {
  const authResult = await requireAuth()
  if (authResult.error) return authResult.error
  const userId = authResult.user.id

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  if (oauthError) {
    return redirectToSettings(request.url, "error")
  }
  if (!isOAuthMcpAvailable()) {
    return redirectToSettings(request.url, "error")
  }
  if (!code || !state) {
    return redirectToSettings(request.url, "error")
  }

  const session = await getMcpOauthSession(state)
  // Session muss existieren, dem eingeloggten User gehören und gültig sein.
  if (!session || session.userId !== userId || session.expiresAt.getTime() < Date.now()) {
    if (session) await deleteMcpOauthSession(state)
    return redirectToSettings(request.url, "error")
  }

  const serverId = session.serverId
  const server = await getActiveOAuthServer(serverId)
  if (!server) {
    await deleteMcpOauthSession(state)
    return redirectToSettings(request.url, "error", serverId)
  }

  const serverUrl = resolveServerUrl(server.url)
  if (!isAllowedUrl(serverUrl)) {
    await deleteMcpOauthSession(state)
    return redirectToSettings(request.url, "error", serverId)
  }

  const provider = new MCPOAuthProvider({
    mode: "callback",
    userId,
    serverId,
    callbackUrl: resolveCallbackUrl(request),
    scopes: server.oauthScopes,
    stateNonce: state,
    clientId: server.oauthClientId,
    clientSecret: decryptServerClientSecret(server.oauthClientSecretEnc),
    storedCodeVerifier: session.codeVerifier,
  })

  try {
    const result = await auth(provider, { serverUrl, authorizationCode: code })
    // Session single-use: in jedem Fall entfernen (verhindert Replay).
    await deleteMcpOauthSession(state)
    if (result !== "AUTHORIZED") {
      return redirectToSettings(request.url, "error", serverId)
    }
    return redirectToSettings(request.url, "connected", serverId)
  } catch (error) {
    await deleteMcpOauthSession(state)
    console.warn(`[MCP-OAuth] callback failed for ${serverId}:`, getErrorMessage(error))
    return redirectToSettings(request.url, "error", serverId)
  }
}
