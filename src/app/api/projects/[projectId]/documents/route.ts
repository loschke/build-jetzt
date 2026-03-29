import { requireAuth } from "@/lib/api-guards"
import { canAccessProject } from "@/lib/db/queries/access"
import {
  getProjectDocuments,
  getDocumentStats,
  createProjectDocument,
} from "@/lib/db/queries/project-documents"
import {
  PROJECT_DOCS_MAX_COUNT,
  PROJECT_DOCS_TOKEN_BUDGET,
  PROJECT_DOCS_MAX_FILE_SIZE,
  PROJECT_DOCS_ALLOWED_EXTENSIONS,
} from "@/config/ai"
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const [documents, stats] = await Promise.all([
    getProjectDocuments(projectId),
    getDocumentStats(projectId),
  ])

  return Response.json({
    documents,
    totalTokens: stats.totalTokens,
    limits: {
      maxCount: PROJECT_DOCS_MAX_COUNT,
      tokenBudget: PROJECT_DOCS_TOKEN_BUDGET,
      maxFileSize: PROJECT_DOCS_MAX_FILE_SIZE,
    },
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuth()
  if (auth.error) return auth.error
  const { user } = auth

  const rateCheck = checkRateLimit(user.id, RATE_LIMITS.api)
  if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfterMs)

  const { projectId } = await params
  const access = await canAccessProject(projectId, user.id)
  if (!access.hasAccess) {
    return Response.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  // Parse FormData
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: "Ungültige Anfrage" }, { status: 400 })
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) {
    return Response.json({ error: "Keine Datei angegeben" }, { status: 400 })
  }

  // Extension check (MIME is unreliable for .md)
  const fileName = file.name.toLowerCase()
  const ext = fileName.substring(fileName.lastIndexOf("."))
  if (!PROJECT_DOCS_ALLOWED_EXTENSIONS.includes(ext)) {
    return Response.json(
      { error: `Nur ${PROJECT_DOCS_ALLOWED_EXTENSIONS.join(", ")} Dateien erlaubt` },
      { status: 400 }
    )
  }

  // File size check
  if (file.size > PROJECT_DOCS_MAX_FILE_SIZE) {
    return Response.json(
      { error: `Datei zu groß (max ${PROJECT_DOCS_MAX_FILE_SIZE / 1000}KB)` },
      { status: 400 }
    )
  }

  // Count + budget check
  const stats = await getDocumentStats(projectId)
  if (stats.count >= PROJECT_DOCS_MAX_COUNT) {
    return Response.json(
      { error: `Maximal ${PROJECT_DOCS_MAX_COUNT} Dateien pro Projekt` },
      { status: 400 }
    )
  }

  // Read file content
  let content: string
  try {
    content = await file.text()
  } catch {
    return Response.json({ error: "Datei konnte nicht gelesen werden" }, { status: 400 })
  }

  if (!content.trim()) {
    return Response.json({ error: "Datei ist leer" }, { status: 400 })
  }

  const tokenCount = Math.ceil(content.length / 4)

  // Token budget check
  if (stats.totalTokens + tokenCount > PROJECT_DOCS_TOKEN_BUDGET) {
    return Response.json(
      {
        error: `Token-Budget überschritten (${stats.totalTokens} + ${tokenCount} > ${PROJECT_DOCS_TOKEN_BUDGET})`,
      },
      { status: 400 }
    )
  }

  const mimeType = ext === ".md" ? "text/markdown" : "text/plain"
  const doc = await createProjectDocument(projectId, {
    title: file.name,
    content,
    mimeType,
    tokenCount,
  })

  return Response.json(doc, { status: 201 })
}
