/**
 * Business-Mode-Status — pure Config-Read.
 *
 * Repliziert das Verhalten von `GET /api/business-mode/status` als Server-Funktion,
 * damit Server Components die Daten direkt einlesen können, ohne einen zusätzlichen
 * HTTP-Roundtrip vom Client zu triggern.
 *
 * Keine Auth, keine DB-Last — alles aus `features` + `businessModeConfig` (ENV-Vars).
 */
import { features } from "@/config/features"
import { businessModeConfig } from "@/config/business-mode"

export type PrivacyRoute = "eu" | "de" | "local"

export interface BusinessModeStatus {
  enabled: boolean
  options: {
    redaction: boolean
    euModel: boolean
    deModel: boolean
    localModel: boolean
  }
  safeChat?: {
    route: PrivacyRoute
    label: string
    hasLocalModel: boolean
  }
}

/**
 * Liefert den Business-Mode-Status oder `null`, wenn das Feature deaktiviert ist.
 * Server-side aufrufbar (kein Network-Call, kein await nötig).
 */
export function getBusinessModeStatus(): BusinessModeStatus | null {
  if (!features.businessMode.enabled) return null

  const hasEuModel = !!businessModeConfig.euModelId
  const hasDeModel = !!businessModeConfig.deModelId
  const hasLocalModel = !!(businessModeConfig.localModelId && businessModeConfig.localProviderUrl)
  const hasAnySecureModel = hasEuModel || hasDeModel || hasLocalModel

  return {
    enabled: true,
    options: {
      redaction: true,
      euModel: hasEuModel,
      deModel: hasDeModel,
      localModel: hasLocalModel,
    },
    safeChat: hasAnySecureModel
      ? {
          route: businessModeConfig.safeChatRoute,
          label: businessModeConfig.safeChatLabel,
          hasLocalModel,
        }
      : undefined,
  }
}
