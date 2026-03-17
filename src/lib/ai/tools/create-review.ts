import { tool } from "ai"
import { z } from "zod"
import { createArtifact } from "@/lib/db/queries/artifacts"
import type { ReviewDefinition } from "@/types/review"

/**
 * create_review tool — creates a structured review artifact.
 * The markdown content is split by ## headings in the renderer.
 * Each section gets feedback controls (approve/change/question/remove + comment).
 *
 * For iteration: previousFeedback carries forward approved sections from earlier rounds,
 * so the user only needs to review changed/new sections.
 */
export function createReviewTool(chatId: string) {
  return tool({
    description:
      "Create a structured document for section-by-section review. " +
      "Use this when you generate concepts, strategies, blog posts, plans, or any longer structured content " +
      "that the user should review and give feedback on before finalizing. " +
      "Write the content as Markdown with ## headings to define reviewable sections. " +
      "Each ## section becomes a separate review block where the user can approve, request changes, ask questions, or remove it. " +
      "Before creating the review, write a brief intro explaining what you've created. " +
      "When creating a revised version after feedback, include previousFeedback with the approved sections from the prior round.",
    inputSchema: z.object({
      title: z.string().max(200).describe("Title of the document being reviewed"),
      content: z.string().min(1).max(500_000).describe("Full markdown content with ## headings as section boundaries"),
      previousFeedback: z
        .array(
          z.object({
            title: z.string(),
            label: z.enum(["approve", "change", "question", "remove"]),
            comment: z.string().optional(),
          })
        )
        .optional()
        .describe("Feedback from a previous review round — approved sections will be pre-marked"),
    }),
    execute: async ({ title, content, previousFeedback }) => {
      const reviewDef: ReviewDefinition = {
        title,
        content,
        ...(previousFeedback && { previousFeedback }),
      }

      const artifact = await createArtifact({
        chatId,
        type: "review",
        title,
        content: JSON.stringify(reviewDef),
      })

      return {
        artifactId: artifact.id,
        title: artifact.title,
        type: "review",
        version: artifact.version,
      }
    },
  })
}
