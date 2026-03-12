"use client"

import { useCallback, useMemo } from "react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { css } from "@codemirror/lang-css"
import { json } from "@codemirror/lang-json"
interface ArtifactEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
}

function getExtensions(language: string) {
  switch (language) {
    case "html":
      return [html()]
    case "javascript":
    case "js":
      return [javascript()]
    case "typescript":
    case "ts":
      return [javascript({ typescript: true })]
    case "jsx":
      return [javascript({ jsx: true })]
    case "tsx":
      return [javascript({ jsx: true, typescript: true })]
    case "python":
    case "py":
      return [python()]
    case "css":
      return [css()]
    case "json":
      return [json()]
    default:
      return [markdown()]
  }
}

export function ArtifactEditor({ value, onChange, language = "markdown" }: ArtifactEditorProps) {
  const { resolvedTheme } = useTheme()
  const handleChange = useCallback(
    (val: string) => {
      onChange(val)
    },
    [onChange]
  )

  const extensions = useMemo(() => getExtensions(language), [language])

  return (
    <CodeMirror
      value={value}
      onChange={handleChange}
      extensions={extensions}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
      }}
      className="h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
    />
  )
}
