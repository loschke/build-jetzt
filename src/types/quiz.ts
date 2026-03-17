/** Question types supported by the quiz system */
export type QuizQuestionType = "single_choice" | "multiple_choice" | "free_text"

/** A single quiz question */
export interface QuizQuestion {
  /** Unique ID within the quiz (e.g. "q1", "q2") */
  id: string
  /** Question type determines input and grading */
  type: QuizQuestionType
  /** The question text */
  question: string
  /** Answer options (required for single_choice / multiple_choice) */
  options?: string[]
  /** Correct answer index (single_choice) or indices (multiple_choice). Not used for free_text. */
  correctAnswer?: number | number[]
  /** Explanation shown after submission */
  explanation?: string
}

/** Complete quiz definition stored as artifact content (JSON) */
export interface QuizDefinition {
  title: string
  description?: string
  questions: QuizQuestion[]
  /** User answers keyed by question ID (set after completion) */
  answers?: Record<string, string | number | number[]>
  /** Grading results (set after completion) */
  results?: QuizResults
}

/** Auto-grading results */
export interface QuizResults {
  /** Total number of questions */
  totalQuestions: number
  /** Auto-graded correct answers */
  correct: number
  /** Auto-graded incorrect answers */
  incorrect: number
  /** Free-text questions that need model evaluation */
  pendingReview: number
  /** Percentage score (auto-graded only) */
  percentage: number
  /** Per-question detail */
  details: QuizQuestionResult[]
  /** ISO timestamp of completion */
  completedAt: string
}

/** Per-question grading result */
export interface QuizQuestionResult {
  questionId: string
  type: QuizQuestionType
  correct?: boolean
  /** User's answer for free_text (model evaluates) */
  userAnswer?: string
  needsReview?: boolean
}
