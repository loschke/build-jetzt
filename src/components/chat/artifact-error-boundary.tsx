"use client"

import { Component } from "react"
import type { ReactNode, ErrorInfo } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ArtifactErrorBoundaryProps {
  children: ReactNode
  onClose?: () => void
}

interface ArtifactErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary specifically for the artifact panel and its children
 * (CodePreview/Shiki, HtmlPreview, ArtifactEditor/CodeMirror).
 * Prevents a crash in artifact rendering from taking down the entire chat.
 */
export class ArtifactErrorBoundary extends Component<ArtifactErrorBoundaryProps, ArtifactErrorBoundaryState> {
  constructor(props: ArtifactErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ArtifactErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ArtifactErrorBoundary] Caught error:", error.message, errorInfo.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  handleClose = () => {
    this.setState({ hasError: false, error: undefined })
    this.props.onClose?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-8">
          <AlertTriangle className="size-8 text-destructive" />
          <div className="text-center">
            <p className="font-semibold">Darstellungsfehler</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Das Artifact konnte nicht angezeigt werden.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Erneut versuchen
            </Button>
            <Button variant="ghost" size="sm" onClick={this.handleClose}>
              Schliessen
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
