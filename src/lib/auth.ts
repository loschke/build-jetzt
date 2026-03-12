import { getLogtoContext } from "@logto/next/server-actions"
import { logtoConfig } from "./logto"

export interface AppUser {
  id: string
  email?: string
  name?: string
  avatar?: string
  username?: string
}

/**
 * Schnelle Auth-Pruefung via Token-Claims (kein HTTP-Call).
 * Reicht fuer Sidebar, Header und Auth-Guards.
 */
export async function getUser(): Promise<AppUser | null> {
  try {
    const context = await getLogtoContext(logtoConfig)

    if (!context.isAuthenticated) {
      return null
    }

    const claims = context.claims

    if (!claims?.sub) {
      return null
    }

    return {
      id: claims.sub,
      email: claims?.email ?? undefined,
      name: claims?.name ?? undefined,
      avatar: claims?.picture ?? undefined,
    }
  } catch {
    // Auth nicht konfiguriert oder Session ungueltig
    return null
  }
}

/**
 * Vollstaendige User-Daten via HTTP-Call zu Logto (userInfo Endpoint).
 * Nur verwenden wo vollstaendige Profildaten noetig sind (z.B. Profil-Seite).
 */
export async function getUserFull(): Promise<AppUser | null> {
  try {
    const context = await getLogtoContext(logtoConfig, {
      fetchUserInfo: true,
    })

    if (!context.isAuthenticated) {
      return null
    }

    const userInfo = context.userInfo
    const claims = context.claims

    const userId = claims?.sub ?? userInfo?.sub
    if (!userId) {
      return null
    }

    return {
      id: userId,
      email: userInfo?.email ?? claims?.email ?? undefined,
      name: userInfo?.name ?? claims?.name ?? undefined,
      avatar: userInfo?.picture ?? claims?.picture ?? undefined,
      username: userInfo?.username ?? undefined,
    }
  } catch {
    // Auth nicht konfiguriert oder Session ungueltig
    return null
  }
}
