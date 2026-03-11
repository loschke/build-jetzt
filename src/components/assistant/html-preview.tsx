"use client"

interface HtmlPreviewProps {
  html: string
}

export function HtmlPreview({ html }: HtmlPreviewProps) {
  return (
    <div className="h-full w-full overflow-auto bg-neutral-900 p-4">
      <iframe
        srcDoc={html}
        sandbox=""
        className="mx-auto w-full border-0"
        style={{ height: "100%", minHeight: "600px" }}
        title="Preview"
      />
    </div>
  )
}
