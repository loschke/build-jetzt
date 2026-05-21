#!/usr/bin/env node
// Einmaliges Bootstrap-Script.
//
// Hintergrund: Die Prod-DB wurde historisch via `pnpm db:push` aufgebaut, nie
// via `db:migrate`. Drizzle's `__drizzle_migrations`-Tabelle (im `drizzle`-
// Schema) existiert daher nicht — `db:migrate` versucht beim ersten Lauf alle
// Migrationen seit 0000 anzuwenden und scheitert sofort, weil die Tabellen
// schon existieren.
//
// Dieses Script:
//   1. Legt Schema "drizzle" an (falls fehlt)
//   2. Legt Tabelle "drizzle"."__drizzle_migrations" an (falls fehlt)
//   3. Fuegt fuer jede Migration im Journal einen Eintrag ein (Hash + when),
//      sofern dieser Hash noch nicht existiert.
//
// Nach dem Lauf sieht `db:migrate` alle vorhandenen Migrationen als bereits
// applied. Beim naechsten echten Schema-Change funktioniert `pnpm db:generate`
// + `pnpm db:migrate` wieder normal.
//
// Ausfuehrung:
//   DATABASE_URL='<prod>' node scripts/bootstrap-drizzle-migrations.mjs
//
// Idempotent — kann mehrfach ausgefuehrt werden.

import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { Pool, neonConfig } from "@neondatabase/serverless"
import ws from "ws"

neonConfig.webSocketConstructor = ws

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, "..")
const drizzleDir = join(repoRoot, "drizzle")

// DATABASE_URL kommt via Node's --env-file Flag aus .env / .env.local
// (siehe pnpm-Script in package.json).
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error(
    "DATABASE_URL ist weder in .env / .env.local noch in der Shell gesetzt.",
  )
  process.exit(1)
}

const journalPath = join(drizzleDir, "meta", "_journal.json")
const journal = JSON.parse(readFileSync(journalPath, "utf8"))

if (!journal.entries || !Array.isArray(journal.entries)) {
  console.error("Journal hat kein entries-Array.")
  process.exit(1)
}

console.log(`Journal: ${journal.entries.length} Migrationen gefunden.`)

const migrations = journal.entries.map((entry) => {
  const sqlPath = join(drizzleDir, `${entry.tag}.sql`)
  const sql = readFileSync(sqlPath, "utf8")
  const hash = createHash("sha256").update(sql).digest("hex")
  return { idx: entry.idx, tag: entry.tag, when: entry.when, hash }
})

const pool = new Pool({ connectionString: databaseUrl })

try {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      "id" SERIAL PRIMARY KEY,
      "hash" text NOT NULL,
      "created_at" bigint
    )
  `)

  const existing = await pool.query(
    `SELECT hash FROM "drizzle"."__drizzle_migrations"`,
  )
  const existingHashes = new Set(existing.rows.map((r) => r.hash))

  let inserted = 0
  let skipped = 0
  for (const m of migrations) {
    if (existingHashes.has(m.hash)) {
      console.log(`  skip   ${m.tag} (Hash bereits in DB)`)
      skipped++
      continue
    }
    await pool.query(
      `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
      [m.hash, m.when],
    )
    console.log(`  insert ${m.tag} (when=${m.when})`)
    inserted++
  }

  const total = await pool.query(
    `SELECT count(*)::int AS c FROM "drizzle"."__drizzle_migrations"`,
  )
  console.log(
    `\nFertig. ${inserted} eingefuegt, ${skipped} uebersprungen. Gesamt in DB: ${total.rows[0].c}`,
  )
} catch (err) {
  console.error("Fehlgeschlagen:", err)
  process.exit(1)
} finally {
  await pool.end()
}
