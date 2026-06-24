/**
 * Ebene A — generischer MCP-`content[]`-Renderer (M1 aus prd-mcp-apps-rendering).
 *
 * Extrahiert renderbare Medien-Blöcke (Bild/Audio) aus dem rohen Tool-Output eines
 * MCP-`dynamic-tool`-Parts. Der Output ist der verbatim durchgereichte `CallToolResult`
 * aus `@ai-sdk/mcp` (verifiziert: AI SDK schreibt `part.output` roh in den UI-Stream,
 * `toModelOutput` betrifft nur die Modell-Sicht). Deckt damit jeden MCP-Server ab, der
 * Inhalte direkt liefert — ohne server-spezifischen Code. Reine Funktion, UI-frei.
 */

export interface McpImageBlock {
  kind: "image"
  src: string
  mimeType?: string
}
export interface McpAudioBlock {
  kind: "audio"
  src: string
  mimeType?: string
}
export type McpMediaBlock = McpImageBlock | McpAudioBlock

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function dataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`
}

/** Images may load from http(s) or data: — app CSP allows `img-src https: data:`. */
function safeImageUrl(uri: unknown): string | undefined {
  if (typeof uri !== "string") return undefined
  if (/^https?:\/\//i.test(uri)) return uri
  if (uri.startsWith("data:image/")) return uri
  return undefined
}

/**
 * Audio only from inline data: — app CSP `media-src` does NOT allow arbitrary
 * https origins, so a remote audio URL would be silently blocked. Remote-audio
 * results fall through to ToolStatus (which still shows the URL) instead of a
 * dead player. Inline blobs are already turned into data: URLs by the caller.
 */
function safeAudioDataUrl(uri: unknown): string | undefined {
  if (typeof uri !== "string") return undefined
  return uri.startsWith("data:audio/") ? uri : undefined
}

/**
 * Pull renderable image/audio blocks out of an MCP tool result `output`.
 * Returns [] for any output without direct media (→ caller falls back to ToolStatus).
 */
export function extractMcpMediaBlocks(output: unknown): McpMediaBlock[] {
  // Unwrap the { type: "json", value } envelope some AI SDK paths use.
  let root: unknown = output
  if (isRecord(root) && root.type === "json" && "value" in root) {
    root = root.value
  }

  // Never surface media for an error result.
  if (isRecord(root) && root.isError === true) return []

  // The content array lives at root.content (raw CallToolResult), is the root itself
  // (a bare array), or sits under root.value (toModelOutput { type: "content", value }).
  let content: unknown[] = []
  if (isRecord(root) && Array.isArray(root.content)) content = root.content
  else if (isRecord(root) && root.type === "content" && Array.isArray(root.value)) content = root.value
  else if (Array.isArray(root)) content = root
  if (content.length === 0) return []

  const blocks: McpMediaBlock[] = []
  for (const item of content) {
    if (!isRecord(item)) continue
    const type = item.type

    // Raw MCP image content.
    if (type === "image" && typeof item.data === "string" && typeof item.mimeType === "string") {
      blocks.push({ kind: "image", src: dataUrl(item.mimeType, item.data), mimeType: item.mimeType })
      continue
    }
    // toModelOutput image projection ({ type: "image-data", data, mediaType }).
    if (type === "image-data" && typeof item.data === "string" && typeof item.mediaType === "string") {
      blocks.push({ kind: "image", src: dataUrl(item.mediaType, item.data), mimeType: item.mediaType })
      continue
    }
    // Raw MCP audio content.
    if (type === "audio" && typeof item.data === "string" && typeof item.mimeType === "string") {
      blocks.push({ kind: "audio", src: dataUrl(item.mimeType, item.data), mimeType: item.mimeType })
      continue
    }
    // Resource link — image by URI (remote audio is dropped, see safeAudioDataUrl).
    if (type === "resource_link") {
      const mt = typeof item.mimeType === "string" ? item.mimeType : undefined
      const imgUrl = safeImageUrl(item.uri)
      if (imgUrl && mt?.startsWith("image/")) { blocks.push({ kind: "image", src: imgUrl, mimeType: mt }); continue }
      const audioUrl = safeAudioDataUrl(item.uri)
      if (audioUrl && mt?.startsWith("audio/")) { blocks.push({ kind: "audio", src: audioUrl, mimeType: mt }); continue }
      continue
    }
    // Embedded resource — inline blob or URI.
    if (type === "resource" && isRecord(item.resource)) {
      const res = item.resource
      const mt = typeof res.mimeType === "string" ? res.mimeType : undefined
      if (mt?.startsWith("image/")) {
        if (typeof res.blob === "string") { blocks.push({ kind: "image", src: dataUrl(mt, res.blob), mimeType: mt }); continue }
        const url = safeImageUrl(res.uri)
        if (url) { blocks.push({ kind: "image", src: url, mimeType: mt }); continue }
      }
      if (mt?.startsWith("audio/")) {
        // Inline blob only — remote audio URLs are blocked by CSP media-src.
        if (typeof res.blob === "string") { blocks.push({ kind: "audio", src: dataUrl(mt, res.blob), mimeType: mt }); continue }
      }
    }
  }
  return blocks
}
