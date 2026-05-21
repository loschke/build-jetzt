import { NextResponse } from "next/server"
import { getOidcEndSessionUrl } from "@/lib/auth/oidc"
import {
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getCurrentIdToken,
  sessionCookieOptions,
} from "@/lib/auth/session"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const baseUrl = process.env.APP_BASE_URL ?? requestUrl.origin
  const postLogoutRedirect = `${baseUrl}/`

  const idToken = await getCurrentIdToken()
  const opts = sessionCookieOptions()

  // Wenn kein gueltiger id_token vorliegt: Cookies lokal loeschen und nach Hause.
  // Sonst RP-initiated Logout via auth.loschke.ai/end-session.
  let response: NextResponse
  if (idToken) {
    try {
      const endSessionUrl = getOidcEndSessionUrl(idToken, postLogoutRedirect)
      response = NextResponse.redirect(endSessionUrl)
    } catch {
      response = NextResponse.redirect(postLogoutRedirect)
    }
  } else {
    response = NextResponse.redirect(postLogoutRedirect)
  }

  response.cookies.set(ID_TOKEN_COOKIE, "", { ...opts, maxAge: 0 })
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...opts, maxAge: 0 })
  return response
}
