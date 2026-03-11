export interface MCPServerConfig {
  /** Unique ID, used as prefix for tool names (e.g. "github" → "github__list_repos") */
  id: string
  /** Display name for logging */
  name: string
  /** SSE/HTTP endpoint URL. Can reference env vars via ${VAR} syntax */
  url: string
  /** Env var that gates this server. Server is only active if this var is set */
  envVar?: string
  /** Optional: restrict this server to specific expert slugs */
  experts?: string[]
  /** Auth headers. Values support ${VAR} syntax for env var interpolation */
  headers?: Record<string, string>
}

/**
 * MCP Server Registry
 *
 * Add MCP servers here. Each server needs:
 * - A unique `id` (becomes tool name prefix)
 * - A `url` (SSE/HTTP endpoint)
 * - An `envVar` for opt-in gating
 *
 * Example:
 * {
 *   id: "github",
 *   name: "GitHub MCP",
 *   url: "${GITHUB_MCP_URL}",
 *   envVar: "GITHUB_MCP_URL",
 *   headers: { Authorization: "Bearer ${GITHUB_TOKEN}" },
 * },
 */
export const MCP_SERVERS: MCPServerConfig[] = [
  // Add MCP server configs here
]

/** Resolve ${VAR} placeholders in a string using process.env */
function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "")
}

/** Resolve all header values */
export function resolveHeaders(
  headers?: Record<string, string>
): Record<string, string> | undefined {
  if (!headers) return undefined
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    resolved[key] = resolveEnvVars(value)
  }
  return resolved
}

/** Get active MCP servers filtered by env var gate and optional expert slug */
export function getActiveMCPServers(expertSlug?: string): MCPServerConfig[] {
  return MCP_SERVERS.filter((server) => {
    // Check env var gate
    if (server.envVar && !process.env[server.envVar]) return false
    // Check expert restriction
    if (server.experts && expertSlug && !server.experts.includes(expertSlug))
      return false
    return true
  }).map((server) => ({
    ...server,
    url: resolveEnvVars(server.url),
  }))
}
