import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

/**
 * Transienter PKCE-State zwischen OAuth-Initiate und -Callback.
 *
 * Eine Zeile pro laufendem Connect-Versuch, identifiziert über `stateNonce`
 * (CSRF-Schutz). Wird beim Callback single-use konsumiert und gelöscht.
 * TTL ~10 Min; abgelaufene Zeilen werden beim Callback abgewiesen / gepruned.
 */
export const mcpOauthSessions = pgTable(
  "mcp_oauth_sessions",
  {
    /** Zufälliger State-Nonce — identifiziert den Flow und schützt vor CSRF. */
    stateNonce: text("state_nonce").primaryKey(),
    /** OIDC sub-Claim des initiierenden Users (Callback prüft Übereinstimmung). */
    userId: text("user_id").notNull(),
    /** MCP-Server-Slug, für den verbunden wird. */
    serverId: text("server_id").notNull(),
    /** PKCE Code-Verifier — wird beim Code-Tausch im Callback gebraucht. */
    codeVerifier: text("code_verifier").notNull(),
    /** Ablaufzeitpunkt (createdAt + ~10 Min). */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("mcp_oauth_sessions_expires_idx").on(t.expiresAt)]
)
