# PRD: BYOK für statische MCP-Connectoren (Bring Your Own Key)

> **Status:** Entwurf zur Team-Besprechung
> **Erstellt:** 2026-06-19
> **Aufwand:** ~2-3 Entwicklungstage
> **Schwester-PRD:** `prd-mcp-oauth-account-auth.md` (teilt Verschlüsselung + Per-User-Credentials-Seam)
> **Konkrete Treiber:** Zernio (Social Publishing), Second Brain (private Knowledgebase)

---

## 1. Kontext & Problem

Mehrere MCP-Server nutzen **statische Bearer-Token**. Aktuell kommt dieser Token aus einer
**plattformweiten ENV-Variable** (`ZERNIO_MCP_TOKEN`, `SECOND_BRAIN_MCP_TOKEN`), die über
`${VAR}`-Platzhalter in URL und Headern zur Connect-Zeit aufgelöst wird. Folge: **alle User teilen sich
ein einziges, persönliches Credential** (das des Plattform-Betreibers).

Das ist im Demo aufgefallen:

- **Zernio** — Ein Kollege hat einen eigenen API-Key, kann ihn aber nicht hinterlegen. Würde er den MCP
  nutzen, liefe es über den geteilten Plattform-Key und er würde auf die **fremden** Social-Accounts posten.
- **Second Brain** — Kollegen haben das Setup kopiert und eigene GitHub-Vaults angelegt. Der MCP ist fest
  an einen Token **und** eine Vault-URL gebunden. Sie können ihr eigenes Second Brain nicht anbinden.

### Gewünschtes Ergebnis

User hinterlegen in ihren Einstellungen ihre **eigenen** statischen Credentials pro MCP-Server (Token,
bei Second Brain zusätzlich die URL). Die so authentifizierten Tools stehen danach automatisch im Chat
zur Verfügung — gebunden an das **eigene** Konto bzw. den **eigenen** Vault.

### Abgrenzung zum OAuth-PRD

| | **BYOK-static** (dieses PRD) | **OAuth-Account-Auth** (Schwester-PRD) |
|---|---|---|
| Auth | Statischer Key, vom User eingegeben | Browser-Login (OAuth 2.1 + PKCE) |
| Beispiele | Zernio, Second Brain | Higgsfield, Flux |
| User-Aktion | Key in Settings einfügen | „Verbinden" → Anbieter-Login |
| Token-Refresh | Nein (statisch) | Ja (Refresh-Token) |
| Komplexität | Niedrig | Hoch (DCR, PKCE, Callback) |

Beide teilen ~70 % Infrastruktur: AES-256-GCM-Verschlüsselung, Per-User-Credentials-Tabelle,
Chat-Time-Injection. **Dieses PRD ist die einfachere Schwester** und verweist auf die geteilte
Infrastruktur statt sie zu duplizieren.

---

## 2. Architektur-Entscheidung: BYOK reitet auf der `${VAR}`-Auflösung

Die MCP-Server speichern URL und Header bereits mit `${VAR}`-Platzhaltern, die zur Connect-Zeit gegen
`process.env` aufgelöst werden (`resolveEnvVars` / `resolveHeaders` in `src/config/mcp.ts`). BYOK fügt
**eine** Schicht ein:

> Eine per-User `userSecrets`-Map, die **Vorrang vor `process.env`** hat.
> Auflösungsreihenfolge: `userSecrets[name]` → `process.env[name]`.

| Server | User-provided Variablen |
|---|---|
| Zernio | `ZERNIO_MCP_TOKEN` (URL ist für alle gleich) |
| Second Brain | `SECOND_BRAIN_MCP_URL` **und** `SECOND_BRAIN_MCP_TOKEN` (eigener Vault) |

Damit ist die Lösung generisch: Jeder Server **deklariert**, welche seiner `${VAR}`-Platzhalter
user-provided sind. Die Settings-UI rendert ein Eingabefeld pro Variable. Neuer BYOK-Server = nur
Seed-Eintrag, kein Code.

### Produktentscheidung: Kein ENV-Fallback (BYOK-Pflicht)

Bei beiden Servern bindet der Key an ein **persönliches** Konto/Vault. Deshalb:

- Ohne eigenen Key = Server für diesen User **inaktiv** (kein stiller Rückgriff auf den Plattform-Key).
- Auch der Betreiber hinterlegt seinen Key künftig in den Settings.
- Die ENV-Variable bleibt nur noch für **echt geteilte** Server (z. B. fal.ai) der Default.

Begründung: Ein Fallback auf den geteilten Key würde Kollegen versehentlich auf **fremde** Socials
posten lassen (Zernio) oder den **fremden** Vault lesen lassen (Second Brain) — dieselbe Klasse von
Problem, einmal schreib-, einmal leseseitig.

Modell — pro Server konfigurierbar über `byokMode`:

| `byokMode` | Verhalten | Beispiel |
|---|---|---|
| `shared` | Ein Plattform-Key für alle (heutiges Verhalten) | fal.ai |
| `byok-optional` | User-Key überschreibt, sonst geteilter Fallback (nur bei echt geteilten Ressourcen) | — |
| `byok-required` | Kein Fallback. Ohne User-Key inaktiv | **Zernio, Second Brain** |

---

## 3. Umzusetzende Änderungen (7 Bausteine)

| # | Baustein | Inhalt |
|---|---|---|
| 1 | **Token-Encryption** | AES-256-GCM-Util + ENV-Key `MCP_TOKEN_ENCRYPTION_KEY` (geteilt mit OAuth-PRD) |
| 2 | **DB-Schema** | Neue Tabelle `user_mcp_credentials` + `mcp_servers` um `byokMode`/`byokVars` erweitern |
| 3 | **Resolution-Layer** | `userSecrets`-Vorrang, Gating-Logik, SSRF-Reihenfolge wahren |
| 4 | **Chat-Pipeline** | User-Credentials laden + als `userSecrets` injizieren |
| 5 | **API-Routes** | `GET /`, `PUT /[serverId]`, `DELETE /[serverId]` |
| 6 | **UI** | Settings-Sektion „Eigene Zugänge" + „Verbindung testen" + Admin-Felder |
| 7 | **Seed + ENV** | Zernio/Second Brain Seeds + `.env.example` |

### 3.1 Token-Encryption (`src/lib/crypto/mcp-tokens.ts`)

- AES-256-GCM mit **einem** Plattform-Key `MCP_TOKEN_ENCRYPTION_KEY` (ENV).
- Funktionen `encryptSecret(plaintext)` / `decryptSecret(ciphertext)`.
- **Wichtig:** Schlüssel **nicht** aus User-/Session-Kontext ableiten — die Entschlüsselung muss
  server-seitig zur Chat-Zeit allein mit `userId` aus der DB möglich sein.
- Identische Util wie im OAuth-PRD, ein gemeinsamer Key. Eines der beiden PRDs legt sie an, das andere
  nutzt sie.

### 3.2 DB-Schema im Detail

**Neu: `user_mcp_credentials`** (`src/lib/db/schema/user-mcp-credentials.ts`) — Key-Value pro
(User, Server, Variable). Bewusst **andere Form** als OAuths token-/refresh-/expiry-Tabelle, weil BYOK
mehrere benannte Werte pro Server braucht (Second Brain = URL + Token):

- `authSub` (text, FK → `users.auth_sub`)
- `serverId` (text, der MCP-Slug)
- `varName` (text, z. B. `ZERNIO_MCP_TOKEN`)
- `encryptedValue` (text)
- `createdAt`, `updatedAt`
- Unique-Index auf `(authSub, serverId, varName)`

**`mcp_servers` erweitern** (`src/lib/db/schema/mcp-servers.ts`):

- `byokMode` (text, default `'shared'`, not null) — `'shared' | 'byok-optional' | 'byok-required'`
- `byokVars` (jsonb `string[]`, nullable) — welche `${VAR}` user-provided sind. Minimal eine Liste von
  Variablennamen; UI-Labels lassen sich aus dem Namen ableiten (optional später Meta für URL- vs.
  Secret-Feldtyp).

Migration via `pnpm db:generate` + `pnpm db:push`. Additiv, keine Bestandsdaten-Migration.

### 3.3 Resolution-Layer (`src/config/mcp.ts` + `src/lib/mcp/index.ts`)

Drei zusammenhängende Änderungen — der heikelste Teil:

**a) `userSecrets`-Vorrang.** `resolveEnvVars` / `resolveHeaders` um optionalen Parameter
`userSecrets?: Record<string,string>` erweitern. Reihenfolge: `userSecrets[name]` → `process.env[name]`.

**b) Gating-Logik** (`getActiveMCPServersForExpert`, ~Zeile 143). Heute droppt der Filter jeden Server,
dessen `envVar` nicht in `process.env` steht. Neu:

- Server aktiv, wenn **(a)** Plattform-ENV gesetzt **oder (b)** der User eine vollständige
  BYOK-Credential-Menge hinterlegt hat.
- Bei `byok-required` zählt **nur (b)** — kein ENV-Fallback.
- Die Funktion muss dafür die `userSecrets` des Users kennen → Signatur erweitern.

**c) SSRF-Threading** (kritisch für Second Brain). Die user-gelieferte URL muss **vor** `isAllowedUrl()`
aufgelöst werden:

- URL-Auflösung passiert in `getActiveMCPServersForExpert` (~Zeile 150).
- Validierung in `connectServer` (`src/lib/mcp/index.ts`, ~Zeile 26).
- Da `userSecrets` in die URL-Auflösung einfließt, trifft die aufgelöste User-URL automatisch den
  bestehenden `isAllowedUrl`-Guard. **Sicherstellen, dass kein Pfad die User-URL daran vorbeiführt.**

> **Verifiziert:** Verbindungen werden **nicht** per `serverId` gepoolt — `connectMCPServers` baut pro
> Request frisch auf und liefert ein `close()`-Handle. Der 60s-Config-Cache hält **unaufgelöste**
> `${VAR}`-Rows (Auflösung erst zur Connect-Zeit). Daher **kein Cross-User-Leak** und kein versehentliches
> Wiederverwenden einer fremden authentifizierten Verbindung. Diese Eigenschaft darf nicht „wegoptimiert"
> werden (keine aufgelösten Handles cachen).

### 3.4 Chat-Pipeline (`src/app/api/chat/build-tools.ts`)

- Neue Query `getUserMcpCredentials(authSub)` → `Record<serverId, Record<varName, decryptedValue>>`
  (`src/lib/db/queries/user-mcp-credentials.ts`), entschlüsselt via Util aus 3.1.
- In `build-tools.ts` vor `getActiveMCPServersForExpert` / `connectMCPServers` laden und als `userSecrets`
  durchreichen. `buildTools` bekommt bereits `userId` — kein neues Plumbing.
- **Graceful degradation:** Fehlt eine Credential oder schlägt die Entschlüsselung fehl → Server fällt
  für den User **still** weg (kein Chat-Crash), analog zur bestehenden `connectServer`-null-Semantik.

### 3.5 API-Routes (`src/app/api/user/mcp-credentials/`)

Muster wie `src/app/api/user/instructions/route.ts` (`requireAuth`, Rate-Limit, Zod):

- `GET /` — BYOK-fähige Server + Verbindungsstatus des Users. **Nie** Klartext-Secrets zurückgeben, nur
  `connected: boolean` pro Variable/Server.
- `PUT /[serverId]` — Credentials setzen/aktualisieren (Body: `{ vars: Record<varName,value> }`),
  verschlüsselt speichern.
- `DELETE /[serverId]` — Credentials des Users für diesen Server löschen.

### 3.6 UI — Settings-Sektion „Eigene Zugänge"

- Pro `byok-required` / `byok-optional`-Server ein Formular (ein Feld pro `byokVars`).
- Secret-Felder als Password-Input; gesetzte Werte als „••• gesetzt" anzeigen, nie Klartext nachladen.
- **„Verbindung testen"-Button** pro Server: wiederverwendet das Health-Check-Muster
  (`src/app/api/admin/mcp-servers/[id]/health/route.ts`) als user-scoped Variante — Connect mit den
  gespeicherten `userSecrets`, 5s Timeout, gibt Tool-Count zurück. Secrets nie loggen.
- Admin-UI: `byokMode` + `byokVars` in der MCP-Server-Verwaltung ergänzen (`src/app/admin/*`,
  `src/lib/validations/mcp-server.ts`).

### 3.7 Seed + ENV

- Zernio + Second Brain um `byokMode: 'byok-required'` + `byokVars` erweitern
  (`imports/mcp-servers/zernio.json`, `imports/mcp-servers/second-brain.json`, ggf. `seeds/mcp-servers/*.md`).
- `.env.example` + `.env.eu.example`: `MCP_TOKEN_ENCRYPTION_KEY` ergänzen; Hinweis, dass
  `ZERNIO_MCP_TOKEN` / `SECOND_BRAIN_MCP_TOKEN` bei BYOK-Pflicht **nicht** mehr als geteilter Default zählen.

---

## 4. Auswirkungen auf die Plattform

### 🟢 Geringes Risiko (additiv)

- **Bestehende `shared`-Server laufen unverändert** — `byokMode` defaulted auf `'shared'`. Der BYOK-Pfad
  ist eine neue Verzweigung.
- Neue DB-Tabelle, keine Migration von Bestandsdaten.
- Resolution-Funktionen bekommen nur **optionale** Parameter.
- **Nicht gefährdet:** Chat-Kernfunktion, statische `shared`-Server, Plattform-Auth (OIDC), bestehende Tools.

### 🟡 Echte Herausforderungen

1. **Fremde User-Secrets in unserer DB.** Bisher lagen Credentials in ENV-Vars. Jetzt speichern wir
   verschlüsselte User-Secrets in Neon — neue Angriffsfläche, DSGVO-relevant (gehört ins
   Verarbeitungsverzeichnis, `docs/system/datenschutz-übersicht.md`). Verlust des Encryption-Keys = alle
   BYOK-Credentials tot.
2. **Gating-Umbau ist subtil.** Die heutige `envVar`-Gate-Logik droppt Server ohne ENV. Der BYOK-Pfad
   muss zusätzlich „User hat Credential" berücksichtigen — Fehler hier macht Server entweder fälschlich
   inaktiv oder fällt fälschlich auf den geteilten Key zurück (Sicherheitsrisiko bei `byok-required`).
3. **SSRF über user-gelieferte URL** (Second Brain). Einzige genuin neue Angriffsfläche: User-kontrollierte
   URL fließt in den Connect-Pfad. Muss zwingend durch `isAllowedUrl()` laufen.
4. **Latenz im Chat-Pfad.** Entschlüsselung + DB-Query pro Request. Klein, aber im Hot-Path —
   `connectServer` hat 5s Timeout.

---

## 5. Gilt die Umsetzung für ALLE statischen MCP?

**Ja.** Jeder Server mit statischem Bearer-Token oder Header-Auth, der heute `${VAR}` nutzt, kann
BYOK-fähig gemacht werden: `byokMode` + `byokVars` setzen, fertig. Kein Code pro Server.

- ✅ **Token-only** (Zernio) — eine Variable.
- ✅ **URL + Token** (Second Brain) — mehrere Variablen.
- ✅ **Beliebige Header-Auth** — solange der Wert über `${VAR}` referenziert wird.
- ❌ **OAuth-Account-Auth** (Higgsfield, Flux) — nicht hier, siehe Schwester-PRD.

---

## 6. Implementierungs-Reihenfolge

1. **Foundation:** Token-Encryption → DB-Schema → Migration → Query-Funktionen
2. **Resolution:** `userSecrets`-Vorrang → Gating → SSRF-Reihenfolge in `connectServer`/`buildTools` verdrahten
3. **API:** 3 Routes
4. **UI:** „Eigene Zugänge"-Sektion + Test-Button + Admin-Felder
5. **Seed + ENV:** Zernio + Second Brain auf `byok-required`, `.env.example`

---

## 7. Verifizierung (End-to-End)

1. `pnpm db:push` → `user_mcp_credentials` + neue `mcp_servers`-Spalten in Drizzle Studio prüfen.
2. Zernio/Second Brain mit `byokMode: 'byok-required'` seeden; ohne User-Key → Tools **nicht** im Chat
   sichtbar (Gating greift, kein ENV-Fallback).
3. Settings → „Eigene Zugänge" → Zernio-Token eintragen → „Verbindung testen" zeigt Tool-Count > 0.
4. Chat mit Expert, der Zernio nutzt → `posts_create` verfügbar, postet auf den **eigenen** Account.
5. Second Brain: eigene URL + Token eintragen → `kb_search` liefert Treffer aus dem **eigenen** Vault.
6. SSRF: interne/Blocklist-URL (z. B. `http://169.254.169.254`) als Second-Brain-URL → Connect von
   `isAllowedUrl` blockiert, Server fällt still weg.
7. Cross-User-Isolation: zweiter Test-User ohne Credentials → sieht die Tools nicht, erbt keine Verbindung.
8. „Trennen" (DELETE) → Tools verschwinden im nächsten Chat.
9. DB-Spalte manuell leeren / falschen Key → Entschlüsselung schlägt fehl → Server fällt graceful weg,
   Chat läuft weiter.
10. Secrets nie in Logs (Health-Route + `connectServer` prüfen).

---

## 8. Bekannte Limitationen (MVP)

- **Kein Token-Refresh** — statische Keys; läuft ein Key ab, muss der User ihn manuell erneuern.
- **Key Rotation:** Neuer `MCP_TOKEN_ENCRYPTION_KEY` erfordert Neueingabe aller BYOK-Credentials.
- **Keine serverseitige Key-Validierung beim Speichern** — Korrektheit zeigt sich erst beim „Testen"
  oder im Chat (graceful Wegfall bei falschem Key).

---

## 9. Offene Fragen fürs Team

- [ ] User-Secrets verschlüsselt in Neon — DSGVO-Bewertung & Eintrag ins Verarbeitungsverzeichnis
      (`docs/system/datenschutz-übersicht.md`).
- [ ] Migrationspfad für den Betreiber: bestehende ENV-Keys einmalig in die Settings übertragen, dann
      ENV entfernen — oder Übergangszeit mit `byok-optional`?
- [ ] Geteilter Crypto-Util + `MCP_TOKEN_ENCRYPTION_KEY` mit dem OAuth-PRD koordinieren — wer legt an,
      wer nutzt?
- [ ] Welche Server zum Start BYOK-fähig (nur Zernio + Second Brain, oder direkt weitere)?
- [ ] Soll `byok-optional` überhaupt ausgeliefert werden, oder reicht `shared` + `byok-required`?
```
