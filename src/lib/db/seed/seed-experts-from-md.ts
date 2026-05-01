import fs from "node:fs"
import path from "node:path"
import { upsertExpertBySlug } from "@/lib/db/queries/experts"
import { parseExpertMarkdown } from "./parse-expert-markdown"
import { getErrorMessage } from "@/lib/errors"
import {
  extractInstanceFilter,
  getSeedConfig,
  shouldSeedForInstance,
  emptySummary,
  type SeedSummary,
} from "./instance-filter"

/**
 * Seed experts from seeds/experts/*.md into database.
 * Idempotent via upsertExpertBySlug.
 * Honors SEED_INSTANCE env var (filter via instances / excludeInstances frontmatter).
 */
export async function seedExperts(): Promise<SeedSummary> {
  const summary = emptySummary()
  const dir = path.join(process.cwd(), "seeds", "experts")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/experts/ directory found, skipping.")
    return summary
  }

  const { instance, dryRun } = getSeedConfig()
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8")

      const filter = extractInstanceFilter(raw)
      if (filter.conflict) {
        console.log(`  ! ${file}: warning — both 'instances' and 'excludeInstances' set; using 'instances'`)
      }
      const decision = shouldSeedForInstance(filter, instance)
      if (!decision.shouldSeed) {
        console.log(`  - ${file}: skipped (${decision.reason})`)
        summary.skipped++
        continue
      }

      const parsed = parseExpertMarkdown(raw)
      if (!parsed) {
        console.log(`  - ${file}: skipped (missing required fields)`)
        summary.skipped++
        continue
      }

      if (dryRun) {
        console.log(`  ~ ${parsed.name} (${parsed.slug}) [dry-run, would seed]`)
      } else {
        const result = await upsertExpertBySlug(parsed)
        console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
      }
      summary.seeded++
    } catch (err) {
      console.error(`  x ${file}:`, getErrorMessage(err))
      summary.errors++
    }
  }

  console.log(`Experts: ${summary.seeded} seeded, ${summary.skipped} skipped, ${summary.errors} errors.`)
  return summary
}
