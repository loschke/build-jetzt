# PRD: OAuth-MCP-Server Support (Account-basierte Authentifizierung)

> **Status:** In Umsetzung (Branch `feat/mcp-oauth-account-auth`, iterativ in 5 Milestones)
> **Erstellt:** 2026-05-29 · **Umsetzung gestartet:** 2026-06-20
> **Aufwand:** ~3-5 Entwicklungstage
> **Verifiziert mit:** Higgsfield AI, Flux (BFL), Neon, Apify, Vercel — alle identischer Standard (Auth Code + PKCE S256 + DCR + Refresh)
> **Launch-Provider (Entscheidung):** Neon zuerst (verifiziert), dann Vercel + Higgsfield; Apify + Flux zweite Welle. Generischer Pfad — neuer Provider = nur Seed.

> **SSRF-Begruendung (bewusste Entscheidung):** OAuth-Server-URLs sind ausschliesslich **admin-konfiguriert** (User liefern nie eine URL). Die internen Discovery-/Token-Fetches von `auth()` zu fremden Auth-Servern (z. B. Apify `console-backend`, Flux Supabase) muessen daher **nicht** durch `isAllowedUrl` — anders als die BYOK-Schwester-PRD mit user-gelieferter URL. Die Connect-URL selbst bleibt `isAllowedUrl`-geprueft.

---

## 1. Kontext & Problem

Die Plattform unterstützt aktuell MCP-Server nur mit **statischer Authentifizierung** — ein plattformweiter API-Key/Bearer-Token, hinterlegt in einer ENV-Variable. Das funktioniert für Dienste wie fal.ai (ein Key für alle).

Eine wachsende Zahl interessanter MCP-Server (Asset-Generierung, SaaS-Tools) nutzt jedoch **Account-basierte Authentifizierung**: Jeder User meldet sich mit seinem **eigenen** Account beim Anbieter an, per Browser-Login (OAuth 2.1 + PKCE). Es gibt keinen statischen API-Key.

**Konkrete Treiber:**
- **Higgsfield AI** (`https://mcp.higgsfield.ai/mcp`) — Bild-/Videogenerierung, primäres Asset-Tool
- **Flux / Black Forest Labs** (`https://mcp.bfl.ai/`) — FLUX-Bildgenerierung, Virtual Try-On

Beide sind ohne diese Erweiterung **nicht anbindbar**.

### Gewünschtes Ergebnis

User können in ihren Einstellungen externe Account-Auth-MCP-Server mit ihrem eigenen Konto verbinden. Die so freigeschalteten Tools stehen danach automatisch im Chat zur Verfügung. Die Plattform speichert die User-Tokens sicher und erneuert sie selbstständig.

---

## 2. Verifizierte Anbieter-Analyse

Per Discovery-Requests (`/.well-known/oauth-protected-resource` + `/.well-known/oauth-authorization-server`) bestätigt:

| Eigenschaft | Higgsfield | Flux (BFL) |
|---|---|---|
| MCP-URL | `https://mcp.higgsfield.ai/mcp` | `https://mcp.bfl.ai/` (Root) |
| Transport | SSE | Streamable HTTP |
| Auth-Flow | Authorization Code + PKCE (S256) | Authorization Code + PKCE (S256) |
| Auth-Server | eigene Domain | Supabase Auth (fremder Tenant) |
| DCR (`registration_endpoint`) | ✅ | ✅ |
| Refresh Tokens | ✅ (`offline_access`) | ✅ (`refresh_token`) |
| Scopes | `openid email offline_access` | `openid email profile` |

**Schlussfolgerung:** Beide nutzen denselben De-facto-Standard (PKCE + DCR + Discovery). Die `@ai-sdk/mcp`-Library (bereits im Projekt, v1.0.25) unterstützt diesen Flow vollständig über das `OAuthClientProvider`-Interface und folgt dem in der Discovery angegebenen Auth-Server automatisch — unabhängig davon, ob dieser beim Anbieter selbst, bei Supabase, Clerk oder Auth0 liegt.

---

## 3. Architektur-Entscheidung: Zwei-Phasen-OAuth

MCP-Verbindungen werden server-seitig im Chat-API-Route aufgebaut. Ein OAuth-Browser-Redirect kann dort nicht inline stattfinden. Deshalb:

1. **Pre-Auth (User Settings):** User klickt "Verbinden" → OAuth-Flow mit Browser-Redirect → Tokens werden verschlüsselt in der DB gespeichert.
2. **Chat-Time (automatisch):** Gespeicherte Tokens werden geladen und an den MCP-Client übergeben. Die Library erneuert abgelaufene Access-Tokens selbstständig via Refresh-Token.

---

## 4. Umzusetzende Änderungen (7 Bausteine)

| # | Baustein | Inhalt |
|---|---|---|
| 1 | **DB-Schema** | 2 neue Tabellen (`user_mcp_connections`, `mcp_oauth_sessions`) + `mcp_servers` um `authType` und DCR-Client-Info erweitern |
| 2 | **Token-Encryption** | AES-256-GCM Utility + neuer ENV-Key `MCP_TOKEN_ENCRYPTION_KEY` |
| 3 | **OAuth-Provider** | 3 Klassen (`Initiate`/`Callback`/`ChatTime`), implementieren `OAuthClientProvider` aus `@ai-sdk/mcp` |
| 4 | **API-Routes** | `GET /list`, `POST /initiate`, `GET /callback`, `DELETE /disconnect` |
| 5 | **Connection-Pipeline** | `connectServer()` + `buildTools()` um optionalen `authProvider` erweitern, OAuth-Resolution pro User |
| 6 | **UI** | Settings-Sektion "Externe Dienste" (Verbinden/Trennen) + Admin-Dropdown `authType` |
| 7 | **Seed + ENV** | Server-Einträge (Higgsfield, Flux) + `.env.example` ergänzen |

### 4.1 DB-Schema im Detail

**`mcp_servers` erweitern** (`src/lib/db/schema/mcp-servers.ts`):
- `authType` (text, default `'static'`, not null) — `'static' | 'oauth'`
- `oauthScopes` (text, nullable)
- `oauthClientId` (text, nullable) — von DCR, **pro Server** (nicht pro User)
- `oauthClientSecretEnc` (text, nullable) — verschlüsselt, falls DCR ein Secret liefert
- `oauthClientRegisteredAt` (timestamp, nullable)

> **Wichtig:** DCR registriert die *Anwendung* (build-jetzt) beim Auth-Server, nicht den einzelnen User. Client-Info gehört daher zum Server und wird beim ersten Connect lazy einmal registriert, danach für alle User wiederverwendet.

**Neu: `user_mcp_connections`** — Tokens pro User (`userId` + `serverId` unique), Felder: `accessTokenEnc`, `refreshTokenEnc`, `tokenType`, `expiresAt`, `scope`, Timestamps.

**Neu: `mcp_oauth_sessions`** — transienter PKCE-State zwischen Initiate und Callback (`stateNonce` unique, `codeVerifier`, `expiresAt`, 10 Min TTL).

### 4.2 OAuth-Provider (`src/lib/mcp/oauth-provider.ts`)

- **`InitiateOAuthProvider`** — captured die Authorization-URL statt zu redirecten, speichert PKCE-Verifier. Route ruft `auth(provider, { serverUrl })` → returned `'REDIRECT'`, URL wird zurückgegeben.
- **`CallbackOAuthProvider`** — tauscht Authorization Code gegen Tokens, verschlüsselt + speichert. Route ruft `auth(provider, { serverUrl, authorizationCode })` → `'AUTHORIZED'`.
- **`ChatTimeOAuthProvider`** — lädt + entschlüsselt Tokens, erneuert sie bei Bedarf. Wirft `MCPReauthRequiredError` wenn Tokens endgültig abgelaufen (graceful degradation).

### 4.3 API-Routes (`src/app/api/user/mcp-connections/`)

- `GET /` — OAuth-Server + Connection-Status des Users
- `POST /[serverId]/initiate` — startet Flow, gibt Authorization-URL zurück
- `GET /callback` — shared Callback für alle Server, `state` identifiziert User+Server
- `DELETE /[serverId]` — Connection trennen

---

## 5. Auswirkungen auf die Plattform

### 🟢 Geringes Risiko (additiv)
- **Bestehende statische MCP-Server laufen unverändert** — `authType` defaulted auf `'static'`. Der OAuth-Pfad ist eine neue Verzweigung.
- `connectServer()` erhält nur einen **optionalen** Parameter — kein bestehender Aufruf muss zwingend angepasst werden.
- Neue DB-Tabellen, keine Migration von Bestandsdaten.
- **Nicht gefährdet:** Chat-Kernfunktion, statische MCP-Server, Plattform-Auth (OIDC), bestehende Tools.

### 🟡 Echte Herausforderungen
1. **Fremde User-Tokens in unserer DB.** Bisher lagen Credentials in ENV-Vars. Jetzt speichern wir verschlüsselte User-Tokens in Neon — neue Angriffsfläche, DSGVO-relevant (gehört ins Verarbeitungsverzeichnis, `docs/system/datenschutz-übersicht.md`). Verlust des Encryption-Keys = alle Connections tot.
2. **OAuth-Ränder fehleranfällig.** Token-Refresh-Races bei parallelen Chats, abgebrochene Callbacks, abgelaufene Refresh-Tokens. Muss überall graceful degradieren (Server fällt still weg statt Chat zu crashen).
3. **Latenz im Chat-Pfad.** Token-Refresh kann einen Roundtrip kosten. `connectServer()` hat 5s Timeout — langsame Auth-Server fallen raus.
4. **DCR-Client-Pflege.** Ändert sich die Callback-URL (neue Domain), müssen DCR-Registrierungen erneuert werden.

---

## 6. Gilt die Umsetzung für ALLE Account-Auth MCP?

**Ja, für den Standardfall.** Es gibt zwei Spielarten:

✅ **Authorization Code + PKCE** (Browser-Redirect) — der De-facto-Standard für Web-MCPs. **Generisch abgedeckt.** Higgsfield + Flux verifiziert. Neuer Server = nur Seed-Eintrag, kein Code.

⚠️ **Voraussetzung:** Der Server muss **DCR** unterstützen (`registration_endpoint`). Falls nicht, braucht es eine kleine Zusatzvariante: Admin trägt `client_id`/`secret` manuell ein (~0.5 Tag, einmalig). Beide Kandidaten haben DCR.

❌ **Device Code Flow** (User tippt Code auf anderem Gerät ein, typisch für CLI-Tools) — **nicht abgedeckt**, aber für unsere Web-Plattform nicht nötig (Redirect-Flow ist verfügbar).

---

## 7. Implementierungs-Reihenfolge

1. **Foundation:** Token-Encryption → DB-Schema → Migration → Query-Funktionen
2. **OAuth-Provider:** 3 Provider-Klassen + `MCPReauthRequiredError`
3. **Pipeline:** Config erweitern → `resolveMCPConfigsWithAuth()` → `connectServer()`/`buildTools()` verdrahten
4. **API:** 4 Routes
5. **UI:** Connections-Komponente + Settings-Sektion + Admin-Feld
6. **Seed + ENV:** Higgsfield + Flux Seeds, `.env.example`

---

## 8. Verifizierung (End-to-End)

1. Migration ausführen (`pnpm db:push`), Tabellen in Drizzle Studio prüfen
2. MCP-Server mit `authType=oauth` anlegen/seeden
3. In Settings "Verbinden" → Anbieter-Login → Redirect zurück → Connection gespeichert
4. Expert mit OAuth-MCP nutzen → Tools verfügbar (z.B. `generate_image`)
5. Access-Token ablaufen lassen → nächster Chat refresht automatisch
6. "Trennen" → Tokens gelöscht → Tools weg
7. Tokens manuell in DB löschen → Chat zeigt Hinweis "Verbindung abgelaufen"

---

## 9. Bekannte Limitationen (MVP)

- **Concurrent Refresh Race:** Last-write-wins bei parallelen Requests (kleines Zeitfenster).
- **Token Revocation:** Kein aktives Revoke beim Trennen (Tokens laufen ab).
- **Key Rotation:** Neuer `MCP_TOKEN_ENCRYPTION_KEY` erfordert Reconnect aller OAuth-Server.
- **Kein Device Code Flow.**

---

## 10. Offene Fragen fürs Team

- [ ] User-Tokens in Neon speichern — DSGVO-Bewertung & Eintrag ins Verarbeitungsverzeichnis nötig?
- [ ] Credit-/Kosten-Modell: Generierungen laufen über das **Anbieter-Konto des Users** (Higgsfield/Flux-Credits), nicht über unsere Plattform-Credits. Wie kommunizieren wir das?
- [ ] Welche Server zum Start freischalten (Higgsfield, Flux, beide)?
- [ ] Asset-Handling: Generierte Bilder/Videos kommen als externe URLs zurück (vergänglich). Brauchen wir Persistierung nach R2 + Rendering-Widgets? (separates Thema, siehe Asset-Handling-Analyse)
