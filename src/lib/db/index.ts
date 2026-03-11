import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"

// Platzhalter — DB-Verbindung wird erst mit echten Credentials aktiv
const connectionString = process.env.DATABASE_URL

export function getDb() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL ist nicht gesetzt. Bitte .env.local konfigurieren."
    )
  }

  const sql = neon(connectionString)
  return drizzle({ client: sql, schema })
}
