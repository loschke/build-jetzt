/**
 * Shared API route guards.
 */

const DEFAULT_MAX_BODY = 1024 * 1024 // 1MB

export function checkBodySize(
  req: Request,
  maxBytes = DEFAULT_MAX_BODY
): Response | null {
  const contentLength = req.headers.get("content-length")
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return new Response("Request too large", { status: 413 })
  }
  return null
}
