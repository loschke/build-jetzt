// Generiert Admin-Import-JSON aus den menschenlesbaren Experten-Seeds.
// Liest seeds/experts/<slug>.md und schreibt imports/experts/<slug>.json
// im exakten Format von createExpertAdminSchema (siehe src/lib/validations/expert.ts)
// und mit demselben Feld-Mapping wie parseExpertMarkdown (src/lib/db/seed/parse-expert-markdown.ts).
//
// Nutzung:
//   node scripts/expert-md-to-json.mjs            # alle seeds/experts/*.md
//   node scripts/expert-md-to-json.mjs seo        # nur seeds/experts/seo.md
//   node scripts/expert-md-to-json.mjs seo writer # mehrere

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import matter from "gray-matter"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..")
const SEED_DIR = path.join(ROOT, "seeds", "experts")
const OUT_DIR = path.join(ROOT, "imports", "experts")

/** Mapping identisch zu parseExpertMarkdown — gleiche Defaults. */
function toExpert(raw) {
  // Windows-Zeilenenden normalisieren, damit der System-Prompt im JSON sauberes \n nutzt
  const normalized = raw.replace(/\r\n?/g, "\n")
  const { data, content } = matter(normalized, { engines: { js: () => ({}) } })
  if (!data?.name || !data?.slug || !data?.description) {
    throw new Error("Frontmatter braucht mindestens name, slug, description")
  }
  return {
    name: data.name,
    slug: data.slug,
    description: data.description,
    icon: data.icon ?? null,
    modelPreference: data.modelPreference ?? null,
    temperature: data.temperature ?? null,
    skillSlugs: data.skillSlugs ?? [],
    allowedTools: data.allowedTools ?? [],
    mcpServerIds: data.mcpServerIds ?? [],
    isPublic: data.isPublic ?? true,
    sortOrder: data.sortOrder ?? 0,
    systemPrompt: content.trim(),
  }
}

const args = process.argv.slice(2).filter((a) => a !== "--all")
const slugs = args.length
  ? args
  : fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))

fs.mkdirSync(OUT_DIR, { recursive: true })

let count = 0
for (const slug of slugs) {
  const src = path.join(SEED_DIR, `${slug}.md`)
  if (!fs.existsSync(src)) {
    console.error(`SKIP ${slug}: ${path.relative(ROOT, src)} nicht gefunden`)
    continue
  }
  const expert = toExpert(fs.readFileSync(src, "utf8"))
  if (expert.slug !== slug) {
    console.error(`WARN ${slug}: Frontmatter-slug "${expert.slug}" weicht vom Dateinamen ab — nutze Frontmatter-slug`)
  }
  const out = path.join(OUT_DIR, `${expert.slug}.json`)
  fs.writeFileSync(out, JSON.stringify(expert, null, 2) + "\n", "utf8")
  console.log(`OK ${path.relative(ROOT, out)} (systemPrompt ${expert.systemPrompt.length} Zeichen, skills ${JSON.stringify(expert.skillSlugs)})`)
  count++
}
console.log(`\nFertig: ${count} Datei(en) generiert.`)
