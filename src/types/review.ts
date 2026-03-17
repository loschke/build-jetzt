/** Feedback labels for section review */
export type ReviewLabel = "approve" | "change" | "question" | "remove"

/** Feedback for a single section */
export interface SectionFeedback {
  /** Section title (heading text) */
  title: string
  /** User's decision */
  label: ReviewLabel
  /** Optional comment (required for change/question) */
  comment?: string
}

/** Review definition stored as artifact content (JSON) */
export interface ReviewDefinition {
  title: string
  /** The full markdown content (split by ## headings in renderer) */
  content: string
  /** Section feedback from previous rounds — sections with "approve" are pre-marked */
  previousFeedback?: SectionFeedback[]
  /** Feedback submitted by user (set after completion) */
  feedback?: SectionFeedback[]
  /** ISO timestamp of completion */
  completedAt?: string
}

/** Display labels for the UI */
export const REVIEW_LABELS: Record<ReviewLabel, { label: string; icon: string }> = {
  approve: { label: "Passt", icon: "check" },
  change: { label: "Ändern", icon: "pencil" },
  question: { label: "Frage", icon: "help-circle" },
  remove: { label: "Raus", icon: "x" },
}
