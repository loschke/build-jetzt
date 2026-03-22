/**
 * MCP server markdown parser.
 * Extracts frontmatter metadata from seed markdown files.
 */

import matter from "gray-matter"
import { z } from "zod"
import type { CreateMcpServerInput } from "@/lib/db/queries/mcp-servers"

const mcpServerFrontmatterSchema = z.object({
  name: z.string().min(1),
  serverId: z.string().min(1),
  description: z.string().optional(),
  url: z.string().min(1),
  transport: z.enum(["sse", "http"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  envVar: z.string().optional(),
  enabledTools: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

export function parseMcpServerMarkdown(raw: string): CreateMcpServerInput | null {
  try {
    const { data } = matter(raw, {
      engines: {
        js: () => ({}),
      },
    })

    const result = mcpServerFrontmatterSchema.safeParse(data)
    if (!result.success) return null

    const fm = result.data
    return {
      serverId: fm.serverId,
      name: fm.name,
      description: fm.description ?? null,
      url: fm.url,
      transport: fm.transport ?? "sse",
      headers: fm.headers ?? null,
      envVar: fm.envVar ?? null,
      enabledTools: fm.enabledTools ?? null,
      isActive: fm.isActive ?? true,
      sortOrder: fm.sortOrder ?? 0,
    }
  } catch {
    return null
  }
}
