import { getCurrentClaims } from "@/lib/auth/session"

export interface AppUser {
  id: string
  email?: string
  name?: string
  avatar?: string
  username?: string
}

/**
 * Schnelle Auth-Pruefung via verifizierte ID-Token-Claims.
 * Reicht fuer Sidebar, Header und Auth-Guards.
 */
export async function getUser(): Promise<AppUser | null> {
  try {
    const claims = await getCurrentClaims()
    if (!claims?.sub) return null

    return {
      id: claims.sub,
      email: claims.email ?? undefined,
      name: claims.name ?? undefined,
      avatar: claims.picture ?? undefined,
    }
  } catch {
    return null
  }
}

/**
 * Vollstaendige User-Daten via UserInfo-Endpoint.
 * Aktuell identisch zu getUser() — die OIDC-Claims enthalten bereits alles, was
 * build-jetzt braucht. Bleibt als Hook fuer zukuenftige Profile-Felder, die nur
 * via UserInfo-HTTP-Call verfuegbar werden.
 */
export async function getUserFull(): Promise<AppUser | null> {
  return getUser()
}
