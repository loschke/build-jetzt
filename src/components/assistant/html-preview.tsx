"use client"

import { useMemo, useState } from "react"

const CSP_META = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; font-src data:;">`

function injectCsp(html: string): string {
  const headMatch = html.match(/<head(\s[^>]*)?>/i)
  if (headMatch && headMatch.index != null) {
    const insertPos = headMatch.index + headMatch[0].length
    return html.slice(0, insertPos) + CSP_META + html.slice(insertPos)
  }
  return CSP_META + html
}

interface HtmlPreviewProps {
  html: string
}

export function HtmlPreview({ html }: HtmlPreviewProps) {
  const [error, setError] = useState(false)
  const safeSrcDoc = useMemo(() => injectCsp(html), [html])

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-900 p-8">
        <p className="text-sm text-neutral-400">
          Vorschau konnte nicht geladen werden.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto bg-neutral-900 p-4">
      <iframe
        srcDoc={safeSrcDoc}
        sandbox="allow-scripts"
        className="mx-auto w-full border-0"
        style={{ height: "100%", minHeight: "600px" }}
        title="Preview"
        onError={() => setError(true)}
      />
    </div>
  )
}
