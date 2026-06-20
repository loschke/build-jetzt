/**
 * OAuthClientProvider-Implementierung für Account-Auth MCP-Server.
 *
 * Eine parametrierte Klasse für drei Kontexte (Modus):
 * - "initiate": startet den Flow, fängt die Authorization-URL ab, speichert PKCE-Verifier
 *   in einer `mcp_oauth_sessions`-Zeile. `redirectToAuthorization` wirft NICHT.
 * - "callback": tauscht den Authorization-Code (liest Verifier aus der Session),
 *   verschlüsselt + speichert Tokens in `user_mcp_connections`.
 * - "chat" (M3): lädt+entschlüsselt Tokens für die Chat-Zeit; `redirectToAuthorization`
 *   markiert die Verbindung als "expired" und WIRFT → graceful Wegfall des Servers.
 *
 * Die DCR-Client-Registrierung (`clientInformation`/`saveClientInformation`) gehört zum
 * *Server* (mcp_servers), nicht zum User — einmal lazy registriert, für alle wiederverwendet.
 */

import type {
  OAuthClientProvider,
  OAuthClientInformation,
  OAuthClientMetadata,
  OAuthTokens,
} from "@ai-sdk/mcp"

import { encryptSecret } from "@/lib/crypto/mcp-tokens"
import { setMcpOauthClientInfo } from "@/lib/db/queries/mcp-servers"
import {
  createMcpOauthSession,
  MCP_OAUTH_SESSION_TTL_MS,
} from "@/lib/db/queries/mcp-oauth-sessions"
import {
  upsertMcpConnection,
  setMcpConnectionStatus,
} from "@/lib/db/queries/user-mcp-connections"

export type MCPOAuthMode = "initiate" | "callback" | "chat"

const CLIENT_NAME = "build-jetzt"

export interface MCPOAuthProviderContext {
  mode: MCPOAuthMode
  userId: string
  serverId: string
  /**
   * Feste Callback-URL — muss bei DCR-Registrierung und Code-Tausch identisch sein.
   * Wird von der Route aus APP_BASE_URL bzw. dem Request-Origin gebaut.
   */
  callbackUrl: string
  /** OAuth-Scopes (space-separated), aus mcp_servers.oauthScopes. */
  scopes?: string | null
  /** State-Nonce — round-trippt als OAuth `state` (CSRF). initiate/callback. */
  stateNonce: string
  /** DCR-Client-ID aus mcp_servers (falls bereits registriert). */
  clientId?: string | null
  /** Entschlüsseltes DCR-Client-Secret (falls vorhanden). */
  clientSecret?: string | null
  /** PKCE-Verifier aus der Session (nur "callback"). */
  storedCodeVerifier?: string
  /** Bereits gespeicherte Tokens (nur "chat", M3). */
  storedTokens?: OAuthTokens
}

export class MCPOAuthProvider implements OAuthClientProvider {
  private ctx: MCPOAuthProviderContext

  /** Im "initiate"-Modus von redirectToAuthorization befüllt. */
  public capturedAuthUrl: URL | undefined

  /** In-Memory PKCE-Verifier (initiate generiert ihn zur Laufzeit). */
  private verifier: string | undefined

  /** Aktuelle DCR-Client-Info (initial aus ctx, von saveClientInformation aktualisiert). */
  private currentClientInfo: OAuthClientInformation | undefined

  constructor(ctx: MCPOAuthProviderContext) {
    this.ctx = ctx
    this.currentClientInfo = ctx.clientId
      ? { client_id: ctx.clientId, client_secret: ctx.clientSecret ?? undefined }
      : undefined
  }

  // --- Client-Identität (Redirect + DCR) ---

  get redirectUrl(): string {
    return this.ctx.callbackUrl
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      redirect_uris: [this.ctx.callbackUrl],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: this.ctx.scopes ?? undefined,
      client_name: CLIENT_NAME,
    }
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    return this.currentClientInfo
  }

  async saveClientInformation(info: OAuthClientInformation): Promise<void> {
    this.currentClientInfo = info
    // DCR registriert die Anwendung beim Auth-Server → pro Server einmal persistieren.
    await setMcpOauthClientInfo(this.ctx.serverId, {
      clientId: info.client_id,
      clientSecretEnc: info.client_secret ? encryptSecret(info.client_secret) : null,
    })
  }

  // --- State (CSRF) ---

  state(): string {
    return this.ctx.stateNonce
  }

  // --- PKCE ---

  async saveCodeVerifier(codeVerifier: string): Promise<void> {
    this.verifier = codeVerifier
    if (this.ctx.mode === "initiate") {
      // Verifier in einer transienten Session ablegen; der Callback liest ihn per stateNonce.
      await createMcpOauthSession({
        stateNonce: this.ctx.stateNonce,
        userId: this.ctx.userId,
        serverId: this.ctx.serverId,
        codeVerifier,
        expiresAt: new Date(Date.now() + MCP_OAUTH_SESSION_TTL_MS),
      })
    }
  }

  async codeVerifier(): Promise<string> {
    const v = this.verifier ?? this.ctx.storedCodeVerifier
    if (!v) {
      throw new Error("PKCE code_verifier fehlt (Session abgelaufen oder ungültig).")
    }
    return v
  }

  // --- Redirect ---

  async redirectToAuthorization(authorizationUrl: URL): Promise<void> {
    if (this.ctx.mode === "initiate") {
      // Statt zu redirecten: URL abfangen, damit die Route sie zurückgeben kann.
      this.capturedAuthUrl = authorizationUrl
      return
    }
    if (this.ctx.mode === "chat") {
      // Kein Browser zur Chat-Zeit. Verbindung als abgelaufen markieren und WERFEN —
      // der Throw fällt in den try/catch von connectServer → Server fällt still weg.
      await setMcpConnectionStatus(this.ctx.userId, this.ctx.serverId, "expired")
      throw new Error(
        `MCP-OAuth-Reauth erforderlich für Server "${this.ctx.serverId}" (User-Reconnect nötig).`
      )
    }
    // callback: sollte hier nie passieren.
    throw new Error("Unerwarteter Redirect im OAuth-Callback-Kontext.")
  }

  // --- Tokens ---

  async tokens(): Promise<OAuthTokens | undefined> {
    // initiate/callback: noch keine Tokens. chat: gespeicherte Tokens (M3).
    return this.ctx.storedTokens
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    const expiresAt =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null

    await upsertMcpConnection(this.ctx.userId, this.ctx.serverId, {
      accessTokenEnc: encryptSecret(tokens.access_token),
      refreshTokenEnc: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null,
      tokenType: tokens.token_type ?? null,
      expiresAt,
      scope: tokens.scope ?? null,
      status: "active",
    })
  }
}
