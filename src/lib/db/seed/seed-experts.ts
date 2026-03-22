/**
 * Unified seed script for all entities.
 * Reads markdown files from seeds/ directory.
 * Run with: pnpm db:seed
 */

import { seedExperts } from "./seed-experts-from-md"
import { seedSkills } from "./seed-skills"
import { seedModels } from "./seed-models"
import { seedMcpServers } from "./seed-mcp-servers"

async function main() {
  console.log("=== Seeding from seeds/ directory ===\n")

  console.log("Seeding experts...")
  await seedExperts()

  console.log("\nSeeding skills...")
  await seedSkills()

  console.log("\nSeeding models...")
  await seedModels()

  console.log("\nSeeding MCP servers...")
  await seedMcpServers()

  console.log("\n=== Done. ===")
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
