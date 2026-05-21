/**
 * Session-Cookies für die OIDC-Integration.
 *
 * Iteration 1: Roh-Token-Cookies wie in lernen-media-studio. JWE-Verschlüsselung
 * folgt in einer späteren Iteration, sobald die Basis stabil läuft.
 */
import { cookies } from "next/headers"
import { verifyIdToken, refreshTokens, type IdTokenClaims } from "./oidc"

// Long-lived Session-Cookies
export const ID_TOKEN_COOKIE = "bj_id_token"
export const REFRESH_TOKEN_COOKIE = "bj_refresh"
export const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60 // 1h
export const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // 7d

// Transient Cookies während Authorization-Code-Flow
export const OAUTH_STATE_COOKIE = "bj_oauth_state"
export const OAUTH_VERIFIER_COOKIE = "bj_oauth_verifier"
export const OAUTH_RETURN_TO_COOKIE = "bj_oauth_return_to"
export const OAUTH_TRANSIENT_MAX_AGE_SECONDS = 10 * 60 // 10min

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }
}

/**
 * Liefert verifizierte ID-Token-Claims aus dem Cookie. Bei abgelaufenem id_token
 * wird via Refresh-Token-Cookie ein neues Paar geholt und die Cookies werden
 * rotiert. In Server-Components ohne Mutationsrecht fällt der Refresh-Pfad
 * still zurück — Claims werden dann beim nächsten Route-Handler frisch geladen.
 */
export async function getCurrentClaims(): Promise<IdTokenClaims | null> {
  const store = await cookies()
  const idToken = store.get(ID_TOKEN_COOKIE)?.value

  if (idToken) {
    try {
      return await verifyIdToken(idToken)
    } catch {
      // Token abgelaufen oder ungültig → Refresh-Pfad versuchen
    }
  }

  const refresh = store.get(REFRESH_TOKEN_COOKIE)?.value
  if (!refresh) return null

  try {
    const tokens = await refreshTokens(refresh)
    const newIdToken = tokens.idToken()
    const claims = await verifyIdToken(newIdToken)

    const opts = sessionCookieOptions()
    try {
      store.set(ID_TOKEN_COOKIE, newIdToken, {
        ...opts,
        maxAge: ID_TOKEN_MAX_AGE_SECONDS,
      })
      if (tokens.hasRefreshToken()) {
        store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken(), {
          ...opts,
          maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
        })
      }
    } catch {
      // Server-Component-Kontext: Cookies sind read-only.
      // Claims liefern wir trotzdem zurück; Rotation greift beim nächsten Mutation-Kontext.
    }

    return claims
  } catch {
    return null
  }
}

/** Aktueller ID-Token aus Cookie (für RP-initiated logout id_token_hint). */
export async function getCurrentIdToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(ID_TOKEN_COOKIE)?.value ?? null
}
