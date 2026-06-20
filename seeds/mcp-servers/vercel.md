---
name: Vercel
serverId: vercel
description: Vercel — Deployments, Projekte und Plattform-Tools über dein eigenes Vercel-Konto
url: https://mcp.vercel.com
transport: http
authType: oauth
oauthScopes: openid offline_access
sortOrder: 61
---

Vercel MCP — Account-basierte Authentifizierung (OAuth 2.1 + PKCE + DCR, Public Client).
Scope `offline_access` ist nötig, damit ein Refresh-Token ausgegeben wird.
Jeder User verbindet sein eigenes Vercel-Konto in den Einstellungen unter „Externe Dienste".
