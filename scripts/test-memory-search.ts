import MemoryClient from "mem0ai"
import { readFileSync } from "fs"
import { resolve } from "path"

const envPath = resolve(__dirname, "../.env")
try {
  const envContent = readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const eq = t.indexOf("=")
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    const v = t.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
} catch {}

const client = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })
const userId = process.argv[2] || "wkxnw7m6tc4d"
const query = process.argv[3] || "Wer ist Rico?"

async function main() {
  console.log(`Suche: "${query}" für User: ${userId}\n`)

  const results = await client.search(query, { user_id: userId, limit: 5 })

  if (Array.isArray(results) && results.length > 0) {
    for (const r of results) {
      console.log(`  [${r.score?.toFixed(2) ?? "?"}] ${r.memory}`)
    }
    console.log(`\n${results.length} Memories gefunden!`)
  } else {
    console.log("Keine Ergebnisse.")
  }
}

main()
