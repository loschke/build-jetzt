"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { MessageResponse } from "@/components/ai-elements/message"
import { Check, Pencil, HelpCircle, X, Send } from "lucide-react"
import type { ReviewDefinition, ReviewLabel, SectionFeedback } from "@/types/review"

interface ReviewRendererProps {
  review: ReviewDefinition
  artifactId?: string
  isStreaming: boolean
  onComplete?: (review: ReviewDefinition, feedback: SectionFeedback[]) => void
}

interface ParsedSection {
  title: string
  content: string
}

/** Split markdown content by ## headings into reviewable sections */
function splitSections(markdown: string): ParsedSection[] {
  const lines = markdown.split("\n")
  const sections: ParsedSection[] = []
  let currentTitle = ""
  let currentLines: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/)
    if (headingMatch) {
      // Save previous section if it has content
      if (currentTitle && currentLines.length > 0) {
        sections.push({ title: currentTitle, content: currentLines.join("\n").trim() })
      }
      currentTitle = headingMatch[1].trim()
      currentLines = []
    } else if (currentTitle) {
      currentLines.push(line)
    } else {
      // Content before first ## heading — treat as intro
      currentLines.push(line)
    }
  }

  // Don't forget the last section
  if (currentTitle && currentLines.length > 0) {
    sections.push({ title: currentTitle, content: currentLines.join("\n").trim() })
  }

  // If no ## headings found, treat entire content as one section
  if (sections.length === 0 && markdown.trim()) {
    const firstLine = markdown.trim().split("\n")[0]
    const title = firstLine.replace(/^#+\s*/, "").trim() || "Inhalt"
    sections.push({ title, content: markdown.trim() })
  }

  return sections
}

const LABEL_CONFIG: Record<ReviewLabel, { label: string; icon: typeof Check; variant: string }> = {
  approve: { label: "Passt", icon: Check, variant: "text-green-700 bg-green-100 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900/50" },
  change: { label: "Ändern", icon: Pencil, variant: "text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-400 dark:bg-amber-950/30 dark:border-amber-900/50" },
  question: { label: "Frage", icon: HelpCircle, variant: "text-blue-700 bg-blue-100 border-blue-200 dark:text-blue-400 dark:bg-blue-950/30 dark:border-blue-900/50" },
  remove: { label: "Raus", icon: X, variant: "text-red-700 bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/50" },
}

export function ReviewRenderer({ review, artifactId, isStreaming, onComplete }: ReviewRendererProps) {
  const sections = useMemo(() => splitSections(review.content), [review.content])
  const isCompleted = !!review.completedAt

  // Build initial labels: only pre-fill "approve" from previousFeedback.
  // Changed/questioned sections stay unlabeled so the user reviews them fresh.
  // If already completed (reload), restore all feedback labels.
  const initialLabels = useMemo(() => {
    const labels: Record<string, ReviewLabel> = {}
    if (review.feedback) {
      // Completed review — restore everything for read-only display
      for (const fb of review.feedback) {
        labels[fb.title] = fb.label
      }
    } else if (review.previousFeedback) {
      // New round — only carry forward approvals as pre-selection
      for (const fb of review.previousFeedback) {
        if (fb.label === "approve") {
          const match = sections.find((s) => s.title === fb.title)
          if (match) labels[match.title] = "approve"
        }
      }
    }
    return labels
  }, [review.previousFeedback, review.feedback, sections])

  const initialComments = useMemo(() => {
    const comments: Record<string, string> = {}
    if (review.feedback) {
      for (const fb of review.feedback) {
        if (fb.comment) comments[fb.title] = fb.comment
      }
    }
    return comments
  }, [review.feedback])

  const [labels, setLabels] = useState<Record<string, ReviewLabel>>(initialLabels)
  const [comments, setComments] = useState<Record<string, string>>(initialComments)
  const [submitted, setSubmitted] = useState(isCompleted)

  const allLabeled = sections.every((s) => labels[s.title] !== undefined)

  const handleLabel = useCallback((title: string, label: ReviewLabel) => {
    setLabels((prev) => ({ ...prev, [title]: label }))
  }, [])

  const handleComment = useCallback((title: string, text: string) => {
    setComments((prev) => ({ ...prev, [title]: text }))
  }, [])

  const handleSubmit = useCallback(() => {
    const feedback: SectionFeedback[] = sections.map((s) => ({
      title: s.title,
      label: labels[s.title] ?? "approve",
      ...(comments[s.title]?.trim() && { comment: comments[s.title].trim() }),
    }))
    const completedReview: ReviewDefinition = {
      ...review,
      feedback,
      completedAt: new Date().toISOString(),
    }
    setSubmitted(true)
    onComplete?.(completedReview, feedback)
  }, [sections, labels, comments, review, onComplete])

  if (isStreaming) {
    return <ReviewStreamingPlaceholder title={review.title} />
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">{review.title}</h2>
          {!submitted && (
            <p className="mt-1 text-xs text-muted-foreground">
              Bewerte jeden Abschnitt und gib optional Anmerkungen.
            </p>
          )}
          {submitted && (
            <p className="mt-1 text-xs text-green-700 dark:text-green-400">
              Feedback abgesendet.
            </p>
          )}
        </div>

        {/* Sections */}
        <div className="divide-y">
          {sections.map((section) => {
            const currentLabel = labels[section.title]
            const isPreApproved = review.previousFeedback?.some(
              (fb) => fb.title === section.title && fb.label === "approve"
            )

            return (
              <SectionBlock
                key={section.title}
                section={section}
                label={currentLabel}
                comment={comments[section.title] ?? ""}
                isPreApproved={!!isPreApproved}
                isReadOnly={submitted}
                onLabel={handleLabel}
                onComment={handleComment}
              />
            )
          })}
        </div>
      </div>

      {/* Submit footer */}
      {!submitted && (
        <div className="border-t p-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {Object.keys(labels).length} von {sections.length} bewertet
          </span>
          <Button
            size="sm"
            disabled={!allLabeled}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            <Send className="size-3.5" />
            Feedback absenden
          </Button>
        </div>
      )}
    </div>
  )
}

/** Single section with content + label buttons + comment */
function SectionBlock({
  section,
  label,
  comment,
  isPreApproved,
  isReadOnly,
  onLabel,
  onComment,
}: {
  section: ParsedSection
  label?: ReviewLabel
  comment: string
  isPreApproved: boolean
  isReadOnly: boolean
  onLabel: (title: string, label: ReviewLabel) => void
  onComment: (title: string, text: string) => void
}) {
  const showComment = label === "change" || label === "question" || comment.trim().length > 0

  return (
    <div className="px-6 py-5 space-y-3">
      {/* Section heading with label badge */}
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold flex-1">{section.title}</h3>
        {label && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${LABEL_CONFIG[label].variant}`}>
            {(() => { const Icon = LABEL_CONFIG[label].icon; return <Icon className="size-3" /> })()}
            {LABEL_CONFIG[label].label}
          </span>
        )}
        {isPreApproved && !label && (
          <span className="text-xs text-muted-foreground italic">Vorher genehmigt</span>
        )}
      </div>

      {/* Content rendered as markdown */}
      <div className={`text-sm ${label === "remove" ? "opacity-40 line-through" : ""}`}>
        <MessageResponse className="chat-prose">
          {section.content}
        </MessageResponse>
      </div>

      {/* Label buttons */}
      {!isReadOnly && (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LABEL_CONFIG) as ReviewLabel[]).map((key) => {
            const config = LABEL_CONFIG[key]
            const Icon = config.icon
            const isActive = label === key
            return (
              <button
                key={key}
                onClick={() => onLabel(section.title, key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? config.variant
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3" />
                {config.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Comment field */}
      {(showComment || (!isReadOnly && label && label !== "approve")) && (
        <textarea
          value={comment}
          onChange={(e) => onComment(section.title, e.target.value)}
          disabled={isReadOnly}
          placeholder={
            label === "change"
              ? "Was soll geändert werden..."
              : label === "question"
                ? "Deine Frage..."
                : "Anmerkung (optional)..."
          }
          className="w-full resize-none rounded-xl border bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-default disabled:opacity-70"
          rows={2}
        />
      )}
    </div>
  )
}

/** Placeholder while review is streaming */
function ReviewStreamingPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-muted p-8 text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <div className="w-full max-w-md space-y-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/20" />
        <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20 [animation-delay:150ms]" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted-foreground/20 [animation-delay:300ms]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted-foreground/20 [animation-delay:450ms]" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground/60">Dokument wird erstellt...</p>
    </div>
  )
}
