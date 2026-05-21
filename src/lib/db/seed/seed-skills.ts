import fs from "node:fs"
import path from "node:path"
import { parseSkillMarkdown } from "@/lib/ai/skills/parser"
import { upsertSkillBySlug } from "@/lib/db/queries/skills"
import { upsertResources, deleteResourcesBySkillId } from "@/lib/db/queries/skill-resources"
import { getErrorMessage } from "@/lib/errors"
import {
  extractInstanceFilter,
  getSeedConfig,
  shouldSeedForInstance,
  emptySummary,
  type SeedSummary,
} from "./instance-filter"

/** Binary file extensions to skip when collecting resources */
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bz2",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".pptx",
  ".mp3", ".mp4", ".wav", ".avi", ".mov",
  ".exe", ".dll", ".so", ".dylib",
])

function isBinaryFile(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return BINARY_EXTENSIONS.has(ext)
}

/**
 * Derive resource category from relative file path prefix.
 */
function deriveCategory(relativePath: string): string {
  if (relativePath.startsWith("shared/")) return "shared"
  if (relativePath.startsWith("specs/")) return "spec"
  if (relativePath.startsWith("templates/")) return "template"
  if (relativePath.startsWith("references/")) return "reference"
  if (relativePath.startsWith("examples/")) return "example"
  return "other"
}

/**
 * Recursively collect all files in a directory, returning paths relative to baseDir.
 */
function collectFiles(dir: string, baseDir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir))
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/")
      results.push(relativePath)
    }
  }

  return results
}

/**
 * Seed skills from markdown files and skill directories into database.
 * Standalone .md files are parsed directly. Directories containing a SKILL.md
 * also have their resource files seeded.
 * Idempotent via upsertSkillBySlug.
 * Honors SEED_INSTANCE env var (filter via instances / excludeInstances frontmatter).
 */
export async function seedSkills(): Promise<SeedSummary> {
  const summary = emptySummary()
  const dir = path.join(process.cwd(), "seeds", "skills")

  if (!fs.existsSync(dir)) {
    console.log("  No seeds/skills/ directory found, skipping.")
    return summary
  }

  const { instance, dryRun } = getSeedConfig()

  // Phase 1: Process standalone .md files
  const mdFiles = fs.readdirSync(dir).filter((f) => f.endsWith(".md"))

  for (const file of mdFiles) {
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

      const parsed = parseSkillMarkdown(raw)
      if (!parsed) {
        console.log(`  - ${file}: skipped (missing required fields)`)
        summary.skipped++
        continue
      }

      if (dryRun) {
        console.log(`  ~ ${parsed.name} (${parsed.slug}) [dry-run, would seed]`)
      } else {
        const result = await upsertSkillBySlug({
          slug: parsed.slug,
          name: parsed.name,
          description: parsed.description,
          content: parsed.content,
          mode: parsed.mode,
          category: parsed.category,
          icon: parsed.icon,
          fields: parsed.fields,
          outputAsArtifact: parsed.outputAsArtifact,
          temperature: parsed.temperature,
          modelId: parsed.modelId,
        })
        console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}`)
      }
      summary.seeded++
    } catch (err) {
      console.error(`  x ${file}:`, getErrorMessage(err))
      summary.errors++
    }
  }

  // Phase 2: Process directories with SKILL.md + resources
  const dirEntries = fs.readdirSync(dir, { withFileTypes: true })
  const skillDirs = dirEntries.filter((e) => e.isDirectory())

  for (const skillDir of skillDirs) {
    const skillDirPath = path.join(dir, skillDir.name)
    let skillMdPath = path.join(skillDirPath, "SKILL.md")

    if (!fs.existsSync(skillMdPath)) {
      const altName = fs.readdirSync(skillDirPath).find(
        (f) => f.toLowerCase() === "skill.md",
      )
      if (!altName) continue
      skillMdPath = path.join(skillDirPath, altName)
    }

    try {
      const result = await seedSkillDirectory(skillDirPath, skillMdPath, skillDir.name, instance, dryRun)
      if (result === "seeded") summary.seeded++
      else if (result === "skipped") summary.skipped++
    } catch (err) {
      console.error(`  x ${skillDir.name}/:`, getErrorMessage(err))
      summary.errors++
    }
  }

  console.log(`Skills: ${summary.seeded} seeded, ${summary.skipped} skipped, ${summary.errors} errors.`)
  return summary
}

/**
 * Seed a single skill directory: parse SKILL.md, upsert skill, and seed resources.
 * Returns whether the skill was seeded, skipped, or errored.
 */
async function seedSkillDirectory(
  skillDirPath: string,
  skillMdPath: string,
  dirName: string,
  instance: string | null,
  dryRun: boolean,
): Promise<"seeded" | "skipped"> {
  const raw = fs.readFileSync(skillMdPath, "utf-8")

  const filter = extractInstanceFilter(raw)
  if (filter.conflict) {
    console.log(`  ! ${dirName}/SKILL.md: warning — both 'instances' and 'excludeInstances' set; using 'instances'`)
  }
  const decision = shouldSeedForInstance(filter, instance)
  if (!decision.shouldSeed) {
    console.log(`  - ${dirName}/: skipped (${decision.reason})`)
    return "skipped"
  }

  const parsed = parseSkillMarkdown(raw)
  if (!parsed) {
    console.log(`  - ${dirName}/: skipped (missing required fields in SKILL.md)`)
    return "skipped"
  }

  if (dryRun) {
    const allFiles = collectFiles(skillDirPath, skillDirPath)
    const resourceCount = allFiles.filter(
      (f) => f.toLowerCase() !== "skill.md" && !isBinaryFile(f) && !f.startsWith(".") && !f.includes("/."),
    ).length
    const info = resourceCount > 0 ? ` with ${resourceCount} resources` : ""
    console.log(`  ~ ${parsed.name} (${parsed.slug})${info} [dry-run, would seed]`)
    return "seeded"
  }

  const result = await upsertSkillBySlug({
    slug: parsed.slug,
    name: parsed.name,
    description: parsed.description,
    content: parsed.content,
    mode: parsed.mode,
    category: parsed.category,
    icon: parsed.icon,
    fields: parsed.fields,
    outputAsArtifact: parsed.outputAsArtifact,
    temperature: parsed.temperature,
    modelId: parsed.modelId,
  })

  // Collect resource files
  const allFiles = collectFiles(skillDirPath, skillDirPath)
  const resources: Array<{ filename: string; content: string; category: string; sortOrder: number }> = []
  let sortIndex = 0

  for (const relativePath of allFiles) {
    if (relativePath.toLowerCase() === "skill.md") continue
    if (isBinaryFile(relativePath)) continue
    if (relativePath.startsWith(".") || relativePath.includes("/.")) continue

    try {
      const content = fs.readFileSync(path.join(skillDirPath, relativePath), "utf-8")
      resources.push({
        filename: relativePath,
        content,
        category: deriveCategory(relativePath),
        sortOrder: sortIndex++,
      })
    } catch {
      continue
    }
  }

  if (resources.length > 0) {
    await deleteResourcesBySkillId(result.id)
    await upsertResources(result.id, resources)
  }

  const resourceInfo = resources.length > 0 ? ` with ${resources.length} resources` : ""
  console.log(`  + ${parsed.name} (${parsed.slug}) -> ${result.id}${resourceInfo}`)
  return "seeded"
}
