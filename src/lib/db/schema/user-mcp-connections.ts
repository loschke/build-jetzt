import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

/**
 * Pro-User OAuth-Tokens für Account-Auth MCP-Server.
 *
 * Eine Zeile pro (User, Server). Tokens sind mit AES-256-GCM verschlüsselt
 * (`src/lib/crypto/mcp-tokens.ts`) — niemals Klartext in der DB.
 *
 * Konvention wie `projects`: `userId` hält den OIDC `sub`-Claim (kein FK zu users).
 */
export const userMcpConnections = pgTable(
  "user_mcp_connections",
  {
    id: text("id").primaryKey(),
    /** OIDC sub-Claim des Users (wie projects.userId). */
    userId: text("user_id").notNull(),
    /** MCP-Server-Slug (mcp_servers.serverId). */
    serverId: text("server_id").notNull(),
    /** Verschlüsselter Access-Token. */
    accessTokenEnc: text("access_token_enc").notNull(),
    /** Verschlüsselter Refresh-Token (nullable, falls der Server keinen ausgibt). */
    refreshTokenEnc: text("refresh_token_enc"),
    /** Token-Typ, üblicherweise "Bearer". */
    tokenType: text("token_type"),
    /** Ablaufzeitpunkt des Access-Tokens (nullable). */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    /** Gewährte Scopes (space-separated). */
    scope: text("scope"),
    /**
     * Verbindungsstatus für die Settings-Anzeige.
     * "active" = nutzbar; "expired" = Refresh endgültig fehlgeschlagen → Reauth nötig.
     */
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("user_mcp_connections_user_server_idx").on(t.userId, t.serverId)]
)
