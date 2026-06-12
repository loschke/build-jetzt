/**
 * Pur-Modus (Pure Chat Mode) — client-side, device-local toggle.
 *
 * When active, the chat runs as a bare LLM: no tools, no skills, no MCP,
 * no memory, no artifacts. Used in seminars to contrast a plain text chat
 * against the full agentic assistant.
 *
 * Deliberately NOT a DB-backed user preference: it is a demo switch that
 * should only affect the presenter's own browser, and avoids a schema
 * migration across many instances. Persisted in localStorage; the actual
 * per-request decision travels as the `pureMode` flag in the chat body.
 */

export const PURE_MODE_STORAGE_KEY = "bj:pure-mode"

/** Custom event dispatched on same-tab changes so open views can react. */
export const PURE_MODE_EVENT = "bj:pure-mode-change"

export function readPureMode(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(PURE_MODE_STORAGE_KEY) === "true"
  } catch {
    return false
  }
}

export function writePureMode(enabled: boolean): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(PURE_MODE_STORAGE_KEY, enabled ? "true" : "false")
    window.dispatchEvent(new CustomEvent(PURE_MODE_EVENT, { detail: enabled }))
  } catch {
    // localStorage unavailable (private mode, quota) — non-critical
  }
}
