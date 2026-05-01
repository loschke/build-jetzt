/**
 * Unified seed script for all entities.
 * Reads markdown files from seeds/ directory.
 * Run with: pnpm db:seed
 *
 * Optional:
 *   SEED_INSTANCE=<slug> pnpm db:seed            — only files matching the instance filter
 *   SEED_INSTANCE=<slug> pnpm db:seed --dry-run  — list what would be seeded, no DB writes
 *
 * Without SEED_INSTANCE, all files are seeded (current default behavior).
 */

import { seedExperts } from "./seed-experts-from-md"
import { seedSkills } from "./seed-skills"
import { seedModels } from "./seed-models"
import { seedMcpServers } from "./seed-mcp-servers"
import { getSeedConfig, getObservedInstanceSlugs, type SeedSummary } from "./instance-filter"

async function main() {
  const { instance, dryRun } = getSeedConfig()

  console.log("=== Seeding from seeds/ directory ===")
  if (instance) {
    console.log(`Filter: instance=${instance}${dryRun ? " (dry-run)" : ""}`)
  } else {
    console.log("No instance filter — all files will be seeded")
    if (dryRun) console.log("Mode: dry-run (no DB writes)")
  }
  console.log("")

  console.log("Seeding experts...")
  const experts = await seedExperts()

  console.log("\nSeeding skills...")
  const skills = await seedSkills()

  console.log("\nSeeding models...")
  const models = await seedModels()

  console.log("\nSeeding MCP servers...")
  const mcp = await seedMcpServers()

  console.log("\n=== Summary ===")
  printRow("Experts", experts)
  printRow("Skills", skills)
  printRow("Models", models)
  printRow("MCP", mcp)

  if (instance) {
    const observed = getObservedInstanceSlugs()
    if (observed.size > 0 && !observed.has(instance)) {
      console.warn(
        `\n⚠  Warning: SEED_INSTANCE="${instance}" was not found in any seed file's ` +
          `'instances' or 'excludeInstances' field. Possible typo?\n   ` +
          `Known instance slugs in seeds: ${[...observed].sort().join(", ")}`,
      )
    }
  }

  console.log("\n=== Done. ===")
  process.exit(0)
}

function printRow(label: string, s: SeedSummary) {
  const parts = [`${s.seeded} seeded`, `${s.skipped} skipped`]
  if (s.errors > 0) parts.push(`${s.errors} errors`)
  console.log(`  ${label.padEnd(8)} ${parts.join(", ")}`)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
