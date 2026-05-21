/**
 * Per-Lambda-Cache für User-Upserts.
 *
 * `ensureUserExists` ist idempotent (ON CONFLICT DO UPDATE), aber jeder Aufruf
 * kostet einen DB-Roundtrip. In einem typischen Chat-Request triggern Sidebar-,
 * Header- und API-Routes gleich mehrere Aufrufe — dieser Cache reduziert das
 * auf einen Upsert pro User pro Lambda-Lebensdauer.
 *
 * Geteilt von:
 * - `requireAuth()` in `src/lib/api-guards.ts` (alle API-Routen)
 * - Server-Component-Pages (`page.tsx`, `design-library/page.tsx`)
 * - OIDC-Callback (`/api/auth/callback`) — siehe `markUserExists` für die
 *   Sonderbehandlung dort: der Callback macht den Upsert direkt mit frischen
 *   OIDC-Claims (Name-Updates etc.) und markiert den Cache anschließend.
 *
 * Cache-Scope: Modul-Level, pro Lambda-Instanz. Bei mehreren Instanzen hat
 * jede ihren eigenen Cache; das ist akzeptabel, weil `ensureUserExists`
 * idempotent ist und ein vereinzelter Doppel-Upsert keine Konsistenzprobleme
 * verursacht.
 */
import { ensureUserExists } from "@/lib/db/queries/users"

const knownUserIds = new Set<string>()

/**
 * Upsert nur, wenn der User in dieser Lambda noch nicht gesehen wurde.
 * No-op bei Cache-Hit.
 */
export async function ensureUserExistsCached(params: {
  authSub: string
  email?: string | null
  name?: string | null
}): Promise<void> {
  if (knownUserIds.has(params.authSub)) return
  await ensureUserExists(params)
  knownUserIds.add(params.authSub)
}

/**
 * Markiert einen User als bereits upserted, ohne eine DB-Query auszulösen.
 * Verwendet vom OIDC-Callback, der den Upsert mit frischen Claims direkt
 * macht und anschließend den Cache primt, damit nachfolgende Page-Mounts
 * den Upsert nicht wiederholen.
 */
export function markUserExists(authSub: string): void {
  knownUserIds.add(authSub)
}
