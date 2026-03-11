"use client"

import { useCallback, useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { html } from "@codemirror/lang-html"

interface ArtifactEditorProps {
  value: string
  onChange: (value: string) => void
  language?: "markdown" | "html"
}

const markdownExtensions = [markdown()]
const htmlExtensions = [html()]

export function ArtifactEditor({ value, onChange, language = "markdown" }: ArtifactEditorProps) {
  const handleChange = useCallback(
    (val: string) => {
      onChange(val)
    },
    [onChange]
  )

  const extensions = useMemo(
    () => (language === "html" ? htmlExtensions : markdownExtensions),
    [language]
  )

  return (
    <CodeMirror
      value={value}
      onChange={handleChange}
      extensions={extensions}
      theme="light"
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
      }}
      className="h-full overflow-auto text-sm [&_.cm-editor]:h-full [&_.cm-scroller]:overflow-auto"
    />
  )
}
