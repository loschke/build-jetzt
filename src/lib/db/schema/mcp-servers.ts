import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core"

export const mcpServers = pgTable("mcp_servers", {
  id: text("id").primaryKey(),
  /** Unique slug, used as tool name prefix (e.g. "github" → "github__list_repos") */
  serverId: text("server_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** SSE/HTTP endpoint URL. Supports ${VAR} env var interpolation */
  url: text("url").notNull(),
  /** Transport type: "sse" or "http" */
  transport: text("transport").notNull().default("sse"),
  /** Auth headers with ${VAR} env var interpolation */
  headers: jsonb("headers").$type<Record<string, string>>(),
  /** Env var that gates this server. Only active if this var is set */
  envVar: text("env_var"),
  /** Tool allowlist. null = all tools, string[] = only these tools */
  enabledTools: jsonb("enabled_tools").$type<string[]>(),
  /**
   * Auth-Modus dieses Servers.
   * "static" (Default) = statische ${VAR}-Header (heutiges Verhalten, unverändert).
   * "oauth" = Account-basierte OAuth 2.1 + PKCE Authentifizierung pro User.
   */
  authType: text("auth_type").notNull().default("static"),
  /** OAuth-Scopes, die beim Connect angefragt werden (space-separated). Nur bei authType="oauth". */
  oauthScopes: text("oauth_scopes"),
  /**
   * DCR-Client-ID — registriert die *Anwendung* (build-jetzt) beim Auth-Server,
   * nicht den einzelnen User. Pro Server einmal lazy registriert, danach für alle User wiederverwendet.
   */
  oauthClientId: text("oauth_client_id"),
  /** Verschlüsseltes DCR-Client-Secret (falls der Auth-Server eins ausgibt; viele sind Public Clients). */
  oauthClientSecretEnc: text("oauth_client_secret_enc"),
  /** Zeitpunkt der DCR-Registrierung. */
  oauthClientRegisteredAt: timestamp("oauth_client_registered_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => [
  uniqueIndex("mcp_servers_server_id_idx").on(t.serverId),
])
