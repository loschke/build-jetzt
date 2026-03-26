/**
 * Shared utilities for Stitch SDK integration.
 * Used by generate-design.ts and edit-design.ts.
 */

/** Stitch download URLs must come from Google-controlled domains (SSRF prevention) */
const ALLOWED_STITCH_HOSTS = [
  "stitch.googleapis.com",
  "storage.googleapis.com",
  "lh3.googleusercontent.com",
]

/**
 * Validate that a Stitch download URL points to an expected Google domain.
 * Prevents SSRF if the Stitch response were tampered with.
 */
export function isAllowedStitchUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:") return false
    return ALLOWED_STITCH_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

const MAX_DEPTH = 20

/**
 * Deep-search an object for a key, returning the first match.
 * Handles varying Stitch API response shapes where data may be
 * nested at different levels depending on the endpoint/version.
 */
export function deepFind(obj: unknown, key: string, depth = 0): unknown {
  if (depth > MAX_DEPTH || !obj || typeof obj !== "object") return undefined
  const record = obj as Record<string, unknown>
  if (key in record) return record[key]
  for (const v of Object.values(record)) {
    const found = deepFind(v, key, depth + 1)
    if (found !== undefined) return found
  }
  return undefined
}
