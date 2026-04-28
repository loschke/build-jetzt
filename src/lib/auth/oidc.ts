/**
 * Pure OIDC-Layer: arctic (OAuth-Client + PKCE) + jose (JWT-Verify).
 * Keine DB-Imports, keine Next-spezifischen Imports — bewusst extraktionsbereit
 * für späteres shared Package, sobald der dritte Client live geht.
 */
import { OAuth2Client, CodeChallengeMethod, decodeIdToken } from "arctic"
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

function buildClient(): OAuth2Client {
  return new OAuth2Client(
    requireEnv("OIDC_CLIENT_ID"),
    requireEnv("OIDC_CLIENT_SECRET"),
    requireEnv("OIDC_REDIRECT_URI"),
  )
}

export const oidcScopes = (process.env.OIDC_SCOPES ?? "openid profile email organization")
  .split(" ")
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

export function createAuthorizationUrl(state: string, codeVerifier: string): URL {
  const client = buildClient()
  return client.createAuthorizationURLWithPKCE(
    requireEnv("OIDC_AUTHORIZE_URL"),
    state,
    CodeChallengeMethod.S256,
    codeVerifier,
    oidcScopes,
  )
}

export async function exchangeCode(code: string, codeVerifier: string) {
  const client = buildClient()
  return client.validateAuthorizationCode(requireEnv("OIDC_TOKEN_URL"), code, codeVerifier)
}

export async function refreshTokens(refreshToken: string) {
  const client = buildClient()
  return client.refreshAccessToken(requireEnv("OIDC_TOKEN_URL"), refreshToken, oidcScopes)
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (_jwks) return _jwks
  _jwks = createRemoteJWKSet(new URL(requireEnv("OIDC_JWKS_URL")))
  return _jwks
}

export type OrgMembership = {
  id: string
  slug: string
  type: string
  role: string
}

export type IdTokenClaims = JWTPayload & {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  organizations?: OrgMembership[]
}

export async function verifyIdToken(idToken: string): Promise<IdTokenClaims> {
  const jwks = getJwks()
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: requireEnv("OIDC_ISSUER"),
    audience: requireEnv("OIDC_CLIENT_ID"),
  })
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("id_token has no sub")
  }
  return payload as IdTokenClaims
}

export function decodeIdTokenClaims(idToken: string): IdTokenClaims {
  return decodeIdToken(idToken) as IdTokenClaims
}

export function getOidcEndSessionUrl(idTokenHint: string, postLogoutRedirectUri: string): URL {
  const url = new URL(requireEnv("OIDC_END_SESSION_URL"))
  url.searchParams.set("id_token_hint", idTokenHint)
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri)
  url.searchParams.set("client_id", requireEnv("OIDC_CLIENT_ID"))
  return url
}
