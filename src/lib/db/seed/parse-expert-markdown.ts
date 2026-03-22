/**
 * Expert markdown parser.
 * Extracts frontmatter metadata and system prompt from seed markdown files.
 */

import matter from "gray-matter"
import { z } from "zod"
import type { CreateExpertInput } from "@/types/expert"

const expertFrontmatterSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().optional(),
  skillSlugs: z.array(z.string()).optional(),
  modelPreference: z.string().nullable().optional(),
  temperature: z.number().optional(),
  allowedTools: z.array(z.string()).optional(),
  mcpServerIds: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export function parseExpertMarkdown(raw: string): CreateExpertInput | null {
  try {
    const { data, content } = matter(raw, {
      engines: {
        js: () => ({}),
      },
    })

    const result = expertFrontmatterSchema.safeParse(data)
    if (!result.success) return null

    const fm = result.data
    return {
      name: fm.name,
      slug: fm.slug,
      description: fm.description,
      icon: fm.icon ?? null,
      systemPrompt: content.trim(),
      skillSlugs: fm.skillSlugs ?? [],
      modelPreference: fm.modelPreference ?? null,
      temperature: fm.temperature ?? null,
      allowedTools: fm.allowedTools ?? [],
      mcpServerIds: fm.mcpServerIds ?? [],
      isPublic: fm.isPublic ?? true,
      sortOrder: fm.sortOrder ?? 0,
    }
  } catch {
    return null
  }
}
