/**
 * YouTube Data API v3 wrapper.
 * Provides search functionality using a plain REST API call.
 */

export interface YouTubeSearchResult {
  videoId: string
  title: string
  channelTitle: string
  publishedAt: string
  description: string
  thumbnailUrl: string
}

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"

/**
 * Search YouTube for videos matching a query.
 * Requires YOUTUBE_API_KEY to be set.
 */
export async function searchYouTube(query: string, maxResults = 5): Promise<YouTubeSearchResult[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not configured")
  }

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: query,
    maxResults: String(Math.min(Math.max(maxResults, 1), 10)),
    key: apiKey,
  })

  const res = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
    signal: AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    console.error(`[YouTube] Search failed (${res.status}):`, text)
    return []
  }

  const data = await res.json() as {
    items?: Array<{
      id: { videoId: string }
      snippet: {
        title: string
        channelTitle: string
        publishedAt: string
        description: string
        thumbnails: { medium?: { url: string }; default?: { url: string } }
      }
    }>
  }

  return (data.items ?? [])
    .filter((item) => isValidVideoId(item.id.videoId))
    .map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
    }))
}

/**
 * Validate a YouTube video ID format (11 chars, alphanumeric + dash/underscore).
 */
export function isValidVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{10,12}$/.test(id)
}

/**
 * Validate that a URL is a YouTube video URL.
 * Supports youtube.com/watch, youtu.be, youtube.com/shorts, youtube-nocookie.com
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace("www.", "")
    return (
      host === "youtube.com" ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com" ||
      host === "m.youtube.com"
    )
  } catch {
    return false
  }
}

/**
 * Extract video ID from various YouTube URL formats.
 */
export function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace("www.", "")

    if (host === "youtu.be") {
      return parsed.pathname.slice(1) || null
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      // /watch?v=ID
      const v = parsed.searchParams.get("v")
      if (v) return v

      // /shorts/ID or /embed/ID
      const match = parsed.pathname.match(/^\/(shorts|embed)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Build an HTML artifact with YouTube video cards.
 * Uses inline SVG play button instead of iframes (blocked by CSP sandbox).
 * Each card links to YouTube via window.open (works in sandbox with allow-popups).
 */
export function buildYouTubeResultsHtml(results: YouTubeSearchResult[], query: string): string {
  if (results.length === 0) {
    return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><title>YouTube: ${escapeHtml(query)}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f0f0f;color:#fff;padding:2rem;text-align:center}
h1{font-size:1.2rem;color:#aaa}</style></head>
<body><h1>Keine Ergebnisse für "${escapeHtml(query)}"</h1></body></html>`
  }

  const videoCards = results.map((r, idx) => `
    <a class="card" href="https://www.youtube.com/watch?v=${r.videoId}" target="_blank" rel="noopener">
      <div class="thumb">
        <img src="${escapeHtml(r.thumbnailUrl)}" alt="" loading="lazy">
        <svg class="play" viewBox="0 0 68 48"><path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/><path d="M45 24 27 14v20" fill="#fff"/></svg>
      </div>
      <div class="info">
        ${idx === 0 ? '<span class="rank">Top-Ergebnis</span>' : ""}
        <div class="title">${escapeHtml(r.title)}</div>
        <div class="meta">
          <span class="channel">${escapeHtml(r.channelTitle)} · ${formatDate(r.publishedAt)}</span>
          <button class="copy-btn" onclick="event.preventDefault();event.stopPropagation();copyUrl('https://www.youtube.com/watch?v=${r.videoId}',this)" title="URL kopieren">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
        </div>
      </div>
    </a>`).join("")

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>YouTube: ${escapeHtml(query)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f0f0f;color:#fff;padding:1rem}
h1{font-size:1rem;color:#aaa;margin-bottom:1rem;font-weight:400}
a{text-decoration:none;color:inherit}
.grid{display:grid;grid-template-columns:1fr;gap:0.75rem}
.card{display:grid;grid-template-columns:160px 1fr;gap:0;border-radius:12px;overflow:hidden;background:#181818;transition:background 0.2s}
.card:hover{background:#222}
.thumb{aspect-ratio:16/9;height:90px;position:relative;background:#111;display:flex;align-items:center;justify-content:center;overflow:hidden}
.thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.play{width:48px;height:34px;position:relative;z-index:1;opacity:0.85}
.card:hover .play{opacity:1}
.info{padding:0.75rem;min-width:0}
.title{font-size:0.85rem;font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.meta{display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem}
.channel{font-size:0.75rem;color:#aaa}
.copy-btn{background:none;border:1px solid #444;border-radius:4px;color:#aaa;cursor:pointer;padding:2px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s}
.copy-btn:hover{color:#fff;border-color:#888}
.copy-btn.copied{color:#3ea6ff;border-color:#3ea6ff}
.copy-btn svg{width:12px;height:12px}
.rank{display:inline-block;font-size:0.65rem;font-weight:600;color:#3ea6ff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem}
.open-hint{display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;color:#3ea6ff;margin-top:0.5rem;opacity:0;transition:opacity 0.2s}
.card:hover .open-hint{opacity:1}
</style>
</head>
<body>
<h1>Ergebnisse für „${escapeHtml(query)}"</h1>
<div class="grid">
${videoCards}
</div>
<script>
function copyUrl(url,btn){
  navigator.clipboard.writeText(url).then(function(){
    btn.classList.add('copied');
    setTimeout(function(){btn.classList.remove('copied')},1500);
  });
}
</script>
</body>
</html>`
}



function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return ""
  }
}
