"use client"

import { useMemo, useCallback } from "react"
import { useTheme } from "next-themes"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { yaml } from "@codemirror/lang-yaml"
import { languages } from "@codemirror/language-data"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  minHeight?: string
  className?: string
}

/**
 * Shared CodeMirror markdown editor.
 * Single import point for all codemirror packages to avoid
 * Turbopack bundling duplicate @codemirror/state instances.
 */
export function MarkdownEditor({ value, onChange, minHeight = "400px", className }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme()
  const extensions = useMemo(() => [
    markdown({ defaultCodeLanguage: yaml(), codeLanguages: languages }),
  ], [])
  const handleChange = useCallback((val: string) => onChange(val), [onChange])

  return (
    <div className="overflow-hidden rounded-md border">
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
        className={`text-sm [&_.cm-scroller]:overflow-auto ${className ?? ""}`}
        style={{ minHeight, "--cm-min-height": minHeight } as React.CSSProperties}
      />
    </div>
  )
}
