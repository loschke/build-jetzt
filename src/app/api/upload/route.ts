import { requireAuth } from "@/lib/api-guards"
import { features } from "@/config/features"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"
import { uploadFile } from "@/lib/storage"
import { FileValidationError } from "@/lib/storage/validation"

export async function POST(req: Request) {
  if (!features.storage.enabled) {
    return new Response("Storage is disabled", { status: 404 })
  }

  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.upload)
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.retryAfterMs)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response("Invalid form data", { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return new Response("No file provided", { status: 400 })
  }

  try {
    const result = await uploadFile(file, user.id)
    return Response.json(result)
  } catch (error) {
    if (error instanceof FileValidationError) {
      return new Response(error.message, { status: 400 })
    }
    console.error("[Upload error]", { error, userId: user.id })
    return new Response("Upload fehlgeschlagen", { status: 500 })
  }
}
