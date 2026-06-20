---
name: Neon
serverId: neon
description: Neon Postgres — Datenbanken, Branches und SQL über dein eigenes Neon-Konto
url: https://mcp.neon.tech/sse
transport: sse
authType: oauth
oauthScopes: read write
sortOrder: 60
---

Neon MCP — Account-basierte Authentifizierung (OAuth 2.1 + PKCE + DCR).
Jeder User verbindet sein eigenes Neon-Konto in den Einstellungen unter „Externe Dienste".
Kein Plattform-Key, kein ENV-Gate — aktiv, sobald MCP_TOKEN_ENCRYPTION_KEY gesetzt ist und der User verbunden hat.
