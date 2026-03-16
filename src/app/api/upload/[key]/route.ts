import path from "node:path"

import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { getSignedDownloadUrl, deleteFile } from "@/lib/storage"

const KEY_PATTERN = /^[a-zA-Z0-9/_.-]+$/

function sanitizeStorageKey(raw: string): string | null {
  const decoded = decodeURIComponent(raw)
  if (!KEY_PATTERN.test(decoded)) return null
  if (decoded.includes("..")) return null
  const normalized = path.posix.normalize(decoded)
  if (normalized !== decoded) return null
  return normalized
}

interface RouteParams {
  params: Promise<{ key: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  if (!features.storage.enabled) {
    return new Response("Storage is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { key } = await params
  const safeKey = sanitizeStorageKey(key)
  if (!safeKey) {
    return new Response("Invalid key", { status: 400 })
  }

  // Scope check: user can only access own files
  if (!safeKey.startsWith(`uploads/${user.id}/`)) {
    return new Response("Forbidden", { status: 403 })
  }

  try {
    const url = await getSignedDownloadUrl(safeKey)
    return Response.json({ url })
  } catch (error) {
    console.error("[Signed URL error]", { error, userId: user.id, safeKey })
    return new Response("Datei nicht gefunden", { status: 404 })
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  if (!features.storage.enabled) {
    return new Response("Storage is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  const { key } = await params
  const safeKey = sanitizeStorageKey(key)
  if (!safeKey) {
    return new Response("Invalid key", { status: 400 })
  }

  // Scope check: user can only delete own files
  if (!safeKey.startsWith(`uploads/${user.id}/`)) {
    return new Response("Forbidden", { status: 403 })
  }

  try {
    await deleteFile(safeKey)
    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("[Delete error]", { error, userId: user.id, safeKey })
    return new Response("Loeschen fehlgeschlagen", { status: 500 })
  }
}
