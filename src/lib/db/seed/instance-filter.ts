/**
 * Instance filter for seed files.
 *
 * Each seed file may declare frontmatter fields:
 *   instances: ["slug-a", "slug-b"]    — whitelist (file only seeds in these instances)
 *   excludeInstances: ["slug-c"]        — blacklist (file seeds everywhere except these)
 *
 * The active instance is read from the SEED_INSTANCE env var. Convention:
 * SEED_INSTANCE == OIDC_CLIENT_ID == loschke-auth org-slug.
 *
 * If SEED_INSTANCE is not set, no filtering is applied (all files seed).
 */

import matter from "gray-matter"

export interface SeedConfig {
  instance: string | null
  dryRun: boolean
}

let cachedConfig: SeedConfig | null = null

export function getSeedConfig(): SeedConfig {
  if (cachedConfig) return cachedConfig
  cachedConfig = {
    instance: process.env.SEED_INSTANCE?.trim() || null,
    dryRun: process.argv.includes("--dry-run"),
  }
  return cachedConfig
}

export interface InstanceFilter {
  instances?: string[]
  excludeInstances?: string[]
  /** True when both fields are set — caller may want to warn */
  conflict: boolean
}

/**
 * Set of all instance slugs observed across seed files during this run.
 * Used by the orchestrator to detect typos in SEED_INSTANCE.
 */
const observedInstanceSlugs = new Set<string>()

export function getObservedInstanceSlugs(): Set<string> {
  return observedInstanceSlugs
}

/**
 * Read instance filter metadata from frontmatter without coupling to the
 * entity-specific Zod parsers. Returns empty filter on parse error.
 * Also records observed slugs for typo-detection.
 */
export function extractInstanceFilter(raw: string): InstanceFilter {
  try {
    const { data } = matter(raw, { engines: { js: () => ({}) } })
    const out: InstanceFilter = { conflict: false }

    if (Array.isArray(data.instances) && data.instances.every((x) => typeof x === "string")) {
      const list = data.instances as string[]
      if (list.length > 0) {
        out.instances = list
        for (const s of list) observedInstanceSlugs.add(s)
      }
    }
    if (
      Array.isArray(data.excludeInstances) &&
      data.excludeInstances.every((x) => typeof x === "string")
    ) {
      const list = data.excludeInstances as string[]
      if (list.length > 0) {
        out.excludeInstances = list
        for (const s of list) observedInstanceSlugs.add(s)
      }
    }
    if (out.instances && out.excludeInstances) out.conflict = true
    return out
  } catch {
    return { conflict: false }
  }
}

export interface FilterDecision {
  shouldSeed: boolean
  reason: string
}

export function shouldSeedForInstance(
  filter: InstanceFilter,
  instance: string | null,
): FilterDecision {
  if (!instance) return { shouldSeed: true, reason: "no instance filter" }

  // Conflict: both set — instances wins, excludeInstances ignored
  if (filter.instances && filter.excludeInstances) {
    const inWhitelist = filter.instances.includes(instance)
    return inWhitelist
      ? { shouldSeed: true, reason: "in instances (excludeInstances ignored — both fields set)" }
      : { shouldSeed: false, reason: "not in instances list (excludeInstances ignored — both fields set)" }
  }

  if (filter.instances) {
    return filter.instances.includes(instance)
      ? { shouldSeed: true, reason: `in instances [${filter.instances.join(", ")}]` }
      : { shouldSeed: false, reason: `not in instances list [${filter.instances.join(", ")}]` }
  }

  if (filter.excludeInstances) {
    return filter.excludeInstances.includes(instance)
      ? { shouldSeed: false, reason: `excluded by excludeInstances [${filter.excludeInstances.join(", ")}]` }
      : { shouldSeed: true, reason: "not blocked by excludeInstances" }
  }

  return { shouldSeed: true, reason: "no instance field on file (default: all)" }
}

export interface SeedSummary {
  seeded: number
  skipped: number
  errors: number
}

export function emptySummary(): SeedSummary {
  return { seeded: 0, skipped: 0, errors: 0 }
}
