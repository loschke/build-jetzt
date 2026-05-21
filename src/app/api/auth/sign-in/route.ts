import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { generateState, generateCodeVerifier } from "arctic"
import { createAuthorizationUrl } from "@/lib/auth/oidc"
import {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_RETURN_TO_COOKIE,
  OAUTH_TRANSIENT_MAX_AGE_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth/session"

export async function GET(request: NextRequest) {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const url = createAuthorizationUrl(state, codeVerifier)

  const response = NextResponse.redirect(url)
  const opts = { ...sessionCookieOptions(), maxAge: OAUTH_TRANSIENT_MAX_AGE_SECONDS }
  response.cookies.set(OAUTH_STATE_COOKIE, state, opts)
  response.cookies.set(OAUTH_VERIFIER_COOKIE, codeVerifier, opts)

  // Optional return_to: nur relative Pfade akzeptieren (offen-Redirect-Schutz)
  const returnTo = request.nextUrl.searchParams.get("return_to")
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    response.cookies.set(OAUTH_RETURN_TO_COOKIE, returnTo, opts)
  }

  return response
}
