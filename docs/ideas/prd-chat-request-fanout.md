# PRD — Chat-Request Fan-Out Reduktion

**Status:** Diskussion · **Datum:** 2026-05-21 · **Autor:** Rico Loschke (mit Claude Code)
**Scope:** `src/app/api/chat/*`, `src/lib/mcp/*`, `src/config/mcp.ts`, `src/components/layout/credit-indicator.tsx`

---

## 1. Kontext

Ein Vercel Runtime-Log zeigt für einen einzigen `POST /api/chat` (200 OK) folgendes Profil:

- **Latenz:** 5.4s (User-perceived) / 7.6s (Function-Duration)
- **Externe API-Calls:** 26
- **Region:** fra1

Bereits eine simple Nachricht — ohne explizite Recherche, ohne Bildgenerierung — löst 26 Roundtrips an externe Services aus. Bei steigender Last wird das sowohl zum Performance- als auch zum Kostenproblem (Vercel-Function-Duration ist abgerechnete Compute-Zeit).

Ziel dieses PRDs: Die Ursachen sauber benennen und einen umsetzbaren Reduktionspfad festlegen, ohne bestehende Features (Anthropic Skills, Expert-spezifische MCP-Tools, Suggested Replies) zu opfern.

---

## 2. Aufdröselung der 26 Calls

Die Calls fallen in zwei voneinander unabhängige Cluster.

### Cluster A — MCP-Discovery (≈ 20 Calls)

Pro Chat-Request ruft `connectMCPServers()` jeden aktiven MCP-Server an ([`src/app/api/chat/build-tools.ts:154-162`](../../src/app/api/chat/build-tools.ts)). Jeder Server triggert mindestens:

- `GET <url>/mcp` — SSE-Stream öffnen (initialize handshake)
- `POST <url>/mcp` — `tools/list` für Tool-Schema-Discovery
- ggf. weitere `POST` während des LLM-Step-Loops (echte Tool-Calls)

Im konkreten Log enthalten:

| Server | Calls | Bemerkung |
|--------|-------|-----------|
| `mcp.loschke.ai/mcp/lernen-content` | 2 | GET + POST |
| `mcp.loschke.ai/mcp/design-library` | 2 | GET + POST |
| `mcp.loschke.ai/mcp/loschke-blog` | ≥ 3 | GET + POST + Tool-Aufrufe |
| `mcp.loschke.ai/mcp/sava-agent-context` | ≥ 3 | GET + POST + Tool-Aufrufe |
| `mcp.context7.com/mcp` | 5 | **2× GET → 405**, dann POST(s) |

### Cluster B — LLM-Kaskade (3 Calls, sequenziell)

1. **Hauptchat** — `POST api.anthropic.com/v1/messages` (1.7s) — direkter Anthropic-Provider (wegen Skills, siehe [`src/app/api/chat/route.ts:247-263`](../../src/app/api/chat/route.ts))
2. **Title-Generation** — `POST ai-gateway/v3/...` (2.0s) — [`src/app/api/chat/persist/post-response.ts:47-53`](../../src/app/api/chat/persist/post-response.ts)
3. **Suggested-Replies** — `POST ai-gateway/v3/...` (2.2s) — [`src/lib/ai/suggested-replies.ts:48-69`](../../src/lib/ai/suggested-replies.ts)

Title und Suggested-Replies laufen via `after()` in [`src/app/api/chat/persist/index.ts:118-132`](../../src/app/api/chat/persist/index.ts) — fire-and-forget, **aber sequenziell**: zwei separate `after()`-Aufrufe ohne `Promise.all`.

---

## 2b. Zusätzlicher Befund — Client-seitiges Credit-Polling (Nachtrag 2026-05-21)

Ein zweites Vercel-Log zeigt nach dem `POST /api/chat` ein anhaltendes Hintergrund-Polling, **obwohl der User nichts mehr tut**:

```
13:25:01.80  GET /api/credits  ← Tab A, Interval-Start
13:25:18.62  GET /api/credits  ← Tab B, Interval-Start (Δ 17s zu Tab A)
13:25:35.51  GET /api/credits  ← chat-updated Event (Stream done + 2s)
13:26:01.80  GET /api/credits  ← Tab A, +60s
13:26:19.58  GET /api/credits  ← Tab B, +60s
13:27:01.80  GET /api/credits  ← Tab A, +60s
13:27:19.51  GET /api/credits  ← Tab B, +60s
...
```

Zwei sauber versetzte 60s-Intervalle laufen weiter, solange der Browser läuft. **Verifiziert (2026-05-21):** Die beiden Reihen entstehen durch zwei parallel geöffnete Browser-Tabs, nicht durch einen Effect-Leak. Der Code in [`credit-indicator.tsx`](../../src/components/layout/credit-indicator.tsx) räumt sein `setInterval` korrekt auf — das eigentliche Problem ist das Polling-Design selbst, das pro Tab unabhängig läuft und sich linear multipliziert.

### Ursache

[`src/components/layout/credit-indicator.tsx:34`](../../src/components/layout/credit-indicator.tsx):

```ts
const interval = setInterval(load, 60_000)
```

Pro montierter `CreditIndicator`-Instanz läuft ein 60s-`setInterval` gegen `/api/credits`. Probleme:

1. **Multi-Tab-Verstärkung:** Jeder offene Tab pollt parallel. Bei N Tabs × M Usern = N×M Calls/Minute, nur fürs Anzeigen einer Zahl.
2. **Hintergrund-Tabs pollen weiter:** Kein `visibilitychange`-Listener, kein `document.hidden`-Check.
3. **Inaktivität egal:** Pollt auch wenn der User stundenlang nichts tut.
4. **DB-Last:** `/api/credits` schlägt vermutlich auf `credit_transactions` durch — bei 100 aktiven Usern × 2 Tabs = ~12k DB-Queries/Stunde nur für die Header-Zahl.

### Fix (in Phase 1 aufnehmen)

| # | Änderung | Datei | Effekt |
|---|----------|-------|--------|
| 1.4 | `setInterval` entfernen, nur noch Event-basiertes Reload via `chat-updated` | [`src/components/layout/credit-indicator.tsx:34`](../../src/components/layout/credit-indicator.tsx) | Eliminiert Hintergrund-Polling komplett. Credits aktualisieren sich nach jedem Chat — das reicht. |
| 1.5 | Alternativ falls 1.4 zu radikal: `visibilitychange`-Listener + Intervall auf 5 min | gleiche Datei | Reduziert Traffic 5× und pausiert in Hintergrund-Tabs |

Empfehlung: **1.4 (Polling weg)**. Die Credits müssen nicht „live" mitlaufen — sie ändern sich nur durch Chat-Aktivität des Users selbst, und dafür gibt es bereits das `chat-updated`-Event.

### Bonus-Beobachtung

Drei `GET /` direkt hintereinander (13:28:22.01 / .09 / 26.69) sind Next.js-Prefetches beim Tab-Wiederfokus. Per se billig, aber stützen die Multi-Tab-Hypothese.

---

## 2c. Initial-Mount-Fan-Out (Nachtrag 2026-05-21)

Beim Klick auf „Neuer Chat" zeigt das Vercel-Log folgende Sequenz:

```
13:40:42.85  GET /                              ← Hard-Reload nach "Neuer Chat"
─ 1.5s Lücke (Browser holt HTML, JS bootet) ─
13:40:44.32  GET /api/chats                     ← Sidebar Chat-Liste
13:40:44.34  GET /api/chats/shared-with-me      ← Sidebar
13:40:44.34  GET /api/business-mode/status      ← Privacy-Toggle
13:40:44.34  GET /api/projects                  ← Sidebar Projekt-Liste
13:40:44.34  GET /api/credits                   ← Header-Badge initial
13:40:44.35  GET /api/user/instructions         ← Custom Instructions
13:40:44.35  GET /api/chats/shared              ← Sidebar eigene Shares
13:40:44.35  GET /                              ← RSC-Refresh (mit ?_rsc=…, im Vercel-Log nicht sichtbar)
```

**8 Calls parallel in 30ms.** Per se nicht alarmierend — jeder hat einen klaren Zweck. Aber zwei Stellen sind unnötig teuer:

### Befund 1 — Hard-Reload statt Soft-Navigation

[`src/components/layout/chat-header.tsx:40`](../../src/components/layout/chat-header.tsx):

```ts
function handleNewChat() {
  window.location.href = "/"
}
```

Das ist ein **Hard-Reload**: kompletter Boot von HTML + JS + Hydrate, Sidebar-Daten werden neu gefetcht obwohl sie sich nicht geändert haben. Mit `router.push("/")` würde Next.js nur den Page-Inhalt austauschen, Layout-Komponenten (Sidebar, Header) bleiben gemountet und behalten ihre Daten.

### Befund 2 — Client-side Fetch für Daten, die Server-Component-fähig sind

[`src/components/chat/chat-view.tsx:197`](../../src/components/chat/chat-view.tsx) und [`src/hooks/use-business-mode.ts:101`](../../src/hooks/use-business-mode.ts) fetchen ihre Daten **client-side nach dem Hydrate**, obwohl die Page-Komponente [`src/app/page.tsx`](../../src/app/page.tsx) eine async Server-Component ist und die Daten ohne Roundtrip direkt aus der DB lesen könnte.

Spart 2 Calls beim Initial-Load + macht den LCP schneller, weil keine Client-Wartezeit auf Settings entsteht.

### Fix (in Phase 1 aufnehmen)

| # | Änderung | Datei | Effekt |
|---|----------|-------|--------|
| 1.5 | `handleNewChat`: `router.push("/")` statt `window.location.href = "/"` | [`src/components/layout/chat-header.tsx:40`](../../src/components/layout/chat-header.tsx) | Spart 4-5 unnötige Calls beim "Neuer Chat"-Klick + spürbar schnelleres Umschalten |
| 1.6 | `customInstructions` und `businessModeStatus` als Props aus `page.tsx` durchreichen, Client-Fetches in `ChatView`/`useBusinessMode` entfernen | [`src/app/page.tsx`](../../src/app/page.tsx), [`src/components/chat/chat-view.tsx:197`](../../src/components/chat/chat-view.tsx), [`src/hooks/use-business-mode.ts:101`](../../src/hooks/use-business-mode.ts) | Spart 2 Roundtrips, schnellerer LCP |

**Bewusst nicht in Phase 1:** Die drei separaten `/api/chats/*`-Endpoints in der Sidebar. Sie laufen schon parallel, jeder hat einen klaren Zweck. Eine Bündelung in `/api/sidebar-init` wäre kosmetisch, kein echter Win.

---

## 2d. Multi-Tool-Call Profile (Nachtrag 2026-05-21)

Ein zweites Vercel-Log misst einen Multi-Step-Chat (Tool-Calls an `loschke-blog`):

- **Request-Duration:** 42.9s · **Function-Duration:** 45.6s · **30 externe Calls**

```
Kategorie                                      Calls  Latenz   Anteil
JWKS-Verify (vermutlich Cold Start)              1    1.2s      3%
MCP-Initialize-Handshakes (4 Server × 4 RT)     16    ~5-10s   53%
Echte MCP-Tool-Aufrufe (loschke-blog)            6    ~0.7s    20%
LLM-Loop (5 Steps Anthropic direct)              5    8.8s     17%
Post-Response (Title + Suggested-Replies)        2    4.8s      7%
```

### Erkenntnis 1 — MCP-Init dominiert auch bei "echter" Tool-Nutzung

Pro MCP-Server kostet die reine Initialisierung **4 Round-Trips**:

1. `GET /mcp` — SSE-Stream öffnen
2. `POST initialize` — JSON-RPC Handshake
3. `POST initialized` — Notification (→ 202)
4. `POST tools/list` — Schema-Discovery

Bei 4 aktiven Servern = **16 Calls Init-Overhead pro Request**, bevor das LLM einen Token generiert. Das ist genau die Last, die Phase 2 (Tool-Discovery-Cache) bei warmer Instanz auf 0 reduziert — die Cache-Wirkung wäre hier **deutlich größer** als beim simplen ersten Request.

### Erkenntnis 2 — JWKS-Cache funktioniert nur bei warmer Instanz

[`src/lib/auth/oidc.ts:49-54`](../../src/lib/auth/oidc.ts) hält das `_jwks`-Objekt als Modul-Cache:

```ts
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null
export function getJwks() {
  if (_jwks) return _jwks
  _jwks = createRemoteJWKSet(new URL(requireEnv("OIDC_JWKS_URL")))
  return _jwks
}
```

Bei Cold Start ist `_jwks === null`, der erste `jwtVerify`-Call fetcht die Schlüssel remote. Im Multi-Tool-Log dauert das **1.2s pro Request** — das ist ein Cold-Start-Effekt. Bei warmen Instanzen fällt dieser Call weg.

**Maßnahme (optional, Phase 2.6):** Den fetched JWKS-Set zusätzlich in einer langlebigeren Schicht (z.B. `unstable_cache` mit 1h TTL) ablegen, damit auch Cold Starts ihn nicht remote holen müssen. Lohnt sich nur, wenn die Cold-Start-Rate hoch ist — bei niedrigem Traffic vielleicht relevant, bei viel Traffic eher nicht.

### Erkenntnis 3 — Function-Duration > Request-Duration verifiziert

- Request-Duration **42.9s** (Time bis User Stream-Ende sieht)
- Function-Duration **45.6s** (abgerechnete Lambda-Compute-Zeit)
- **Δ 2.7s** = die `after()`-Tasks (Title 2.0s + Suggested-Replies 2.8s sequenziell, davon wird ein Teil noch im Stream-Tail mitlaufen)

Das ist exakt die Größenordnung, die **Phase 1.2 (Title + Replies parallelisieren)** einsparen würde — und in Multi-Tool-Szenarien skaliert das mit der Anzahl Title-relevanter Folgechats nicht weiter.

### Erkenntnis 4 — LLM-Loop mit 5 Steps für eine Recherche-Frage

Das Modell hat den Tool `loschke-blog` 6× aufgerufen (verteilt über 5 Steps, Step 4 mit 3 parallelen Calls). Pro Step: ~1.5-1.9s Modell-Reasoning. Das ist by-design teuer und nicht durch Infrastruktur lösbar — eher ein Tool-Design-Thema (klarere Beschreibungen, ggf. Batch-Tools, ggf. der Hint im System-Prompt „suche einmal mit aussagekräftigem Query"). **Aktuell nicht im Scope, aber als Beobachtung notiert.**

---

## 2e. Cold vs. Warm Lambda-Vergleich (Nachtrag 2026-05-21)

Folge-Request 49s nach dem ersten (gleiche Lambda noch warm), gleichartige Blog-Recherche im **existierenden** Chat:

| Metrik | Cold (erstes Multi-Tool-Log) | Warm (Folge-Log) | Delta |
|---|---|---|---|
| External Calls | 30 | 29 | −1 (JWKS) |
| JWKS-Call | 1205ms | **fehlt** | ✅ Modul-Cache greift |
| MCP GET-Latenz | 262-1389ms | **180-228ms** | ✅ TCP-Connections warm |
| MCP POST-Latenz | 109-1484ms | 114-926ms | leicht besser |
| Function-Duration | 45.6s | 61.0s | ⚠️ länger (LLM-Variabilität) |
| Gateway-Calls (Post-Response) | 2 (Title + Replies) | 1 (nur Replies, `isNewChat=false`) | Title-Gen wird bereits geskippt für Folgechats |

**Verifizierte Hypothesen:**
1. JWKS-Modul-Cache funktioniert — bei warmer Instanz kein Auth-Server-Roundtrip. Phase 2.6 (zusätzlicher `unstable_cache`-Layer) ist damit nur für hohe Cold-Start-Raten relevant.
2. MCP-Server-Verbindungen profitieren von warmer Instanz (TCP-Reuse), aber die **16 Init-Calls bleiben** — `connectMCPServers()` baut pro Request neue MCP-Sessions auf. **Das ist der einzige große Hebel, der durch Code-Änderung lösbar ist (Phase 2).**
3. Title-Generation wird für Folgechats automatisch geskippt — Phase 1.2-Wirkung war in Folgechats schon vorher unsichtbar, hauptsächlich bei neuen Chats relevant.

**Anti-Hypothese:** „Warm = schneller insgesamt" stimmt **nicht**. Die LLM-Variabilität (Output-Länge, Reasoning-Tiefe) dominiert die Cold/Warm-Differenz. Performance-Verbesserungen müssen über Phase-2-Reduzierung der Init-Calls kommen, nicht über Lambda-Warmth.

---

## 2f. Auth-Redirect-Loop nach Stream-Ende (Nachtrag 2026-05-21)

Im Folge-Log erscheinen nach dem Chat-Stream Auth-Redirect-Loops, die mit dem MCP-Thema nichts zu tun haben, aber zum gleichen Fanout-Problem beitragen:

```
13:57:44.54  GET /api/credits                → 307
13:57:44.60  GET /api/auth/sign-in           → 307
13:57:55.99  GET /api/chats/.../suggestions  → 307  (Polling-Retry 1)
13:57:56.05  GET /api/auth/sign-in           → 307
13:57:59.25  GET /api/chats/.../suggestions  → 307  (Polling-Retry 2)
13:57:59.30  GET /api/auth/sign-in           → 307
13:58:03.48  GET /api/chats/.../suggestions  → 307  (Polling-Retry 3)
13:58:03.53  GET /api/auth/sign-in           → 307
```

### Ursache

[`src/proxy.ts:50-54`](../../src/proxy.ts) prüft nur die **Existenz** der Session-Cookies, nicht ihre Gültigkeit. Wenn weder `bj_id_token` noch `bj_refresh` da ist → 307 zu `/api/auth/sign-in`. Beide Redirects landen im Vercel-Log.

[`src/components/chat/suggested-replies.tsx:21`](../../src/components/chat/suggested-replies.tsx) macht **3 Retries mit 2/3/4s Delay**, ohne Check auf `res.ok` oder Status-Code-Auswertung:

```ts
const DELAYS = [2000, 3000, 4000]
// ...
const res = await fetch(`/api/chats/${chatId}/suggestions`)
if (!res.ok || cancelled) return  // bricht zwar ab, aber attempt zählt weiter
```

Das `if (!res.ok)` bricht zwar diesen Versuch ab, aber der nächste Retry läuft trotzdem. Bei 307 ohne Body wird `res.ok = false` sein (307 ist Redirect, kein Success) → der Versuch wird verworfen, aber 3× wiederholt.

**Pro Auth-Failure-Cycle: 2 Calls (suggestions + sign-in), 3 Retries = 6 Calls** — für eine UI-Komponente, die im aktuellen Auth-State nichts rendern kann.

### Eigentlicher Bug (Cookie-Verlust)

Die tieferliegende Frage **„warum sind die Cookies weg?"** ist nicht aus dem Log allein beantwortbar. Mögliche Ursachen:
- ID-Token abgelaufen (1h) UND Refresh-Token nicht gesetzt (Edge-Case beim Initial-Login)
- Cookie vom Browser gelöscht (Privacy-Settings, Tab-Close)
- Race-Condition mit parallelem Tab, der gerade refresht hat
- Cross-Origin/SameSite-Issue zwischen `auth.loschke.ai` und `build.jetzt`

**Empfehlung:** Cookie-Lebenszyklus separat untersuchen (eigenes Debugging-Ticket), nicht in dieses PRD aufnehmen.

### Fix für das Polling (in Phase 1 aufnehmen)

| # | Änderung | Datei | Effekt |
|---|----------|-------|--------|
| 1.7 | Suggested-Replies-Polling stoppt bei Status 307/401/403 (Auth-Failure), nicht nur bei `!res.ok`. Zusätzlich: kein Retry, wenn der erste Call Auth-Redirect zurückgibt | [`src/components/chat/suggested-replies.tsx:26-43`](../../src/components/chat/suggested-replies.tsx) | Eliminiert 4-6 redundante Calls bei Auth-Verlust + 2× Last auf Proxy für nichts |

---

## 2g. DB-Last (Nachtrag 2026-05-21)

Erste Sondierung über das Neon Query-Performance Dashboard (`pg_stat_statements`). **Wichtig:** Die Daten sind Aggregate seit dem letzten Stats-Reset ohne Zeitfilter — die meisten Findings sind als **Patterns und Verhältnisse robust**, absolute „pro Chat"-Zahlen müssten via Reset + definiertem Test-Request noch verifiziert werden.

### Robuste Findings

**Persistierungs-Bündel arbeitet konsistent.**
`INSERT INTO chats` (4) = `INSERT INTO usage_logs` (4) = `INSERT INTO credit_transactions` (4). Das 1:1:1-Verhältnis bestätigt, dass [`persist/index.ts`](../../src/app/api/chat/persist/index.ts) sauber pro Chat-Response ein Bündel persistiert. Keine Auffälligkeit.

**Cache-Layer für statische Daten funktionieren.**
`models` taucht in den Top-20 gar nicht auf, `mcp_servers` läuft nur 4× mit 0.6ms — bestätigt die 60s-TTL-Caches aus [`src/config/mcp.ts`](../../src/config/mcp.ts) und [`src/lib/db/queries/models.ts`](../../src/lib/db/queries/models.ts).

**`skills`-Discovery-Query ist langsamer als erwartet.**

```sql
SELECT * FROM skills WHERE is_active = $1 AND user_id IS NULL ORDER BY sort_order, name
```

**4.3ms avg** — für eine simple Equality-Query auf <100 Zeilen deutet das auf einen fehlenden Index hin.

### Nuancierte Findings (Hypothesen aus Aggregaten)

**`ensureUserExists` wird oft aufgerufen ohne Cache in Server Components.**
`INSERT INTO users ON CONFLICT DO UPDATE` läuft 13×. [`api-guards.ts:12,34-37`](../../src/lib/api-guards.ts) hat einen `knownUserIds`-Set-Cache pro Lambda-Instanz, der Upserts auf 1× pro User pro Lambda begrenzt. Aber:

- [`page.tsx:27`](../../src/app/page.tsx) und [`design-library/page.tsx:14`](../../src/app/design-library/page.tsx) rufen `ensureUserExists` **ohne diesen Cache** auf
- Jeder Hard-Reload von `/` (bis Phase 1.5 umgesetzt ist) triggert einen Upsert
- `/api/auth/callback` triggert bei Login ebenfalls einen

Das Verhältnis 13:4 ist plausibel, die Hochrechnung „3.25× pro Chat-Request" wäre aber überinterpretiert — viele Upserts kommen aus Page-Reloads und Logins, nicht aus dem Chat-Pfad selbst.

**`/api/credits` produziert die meiste SELECT-Last.**

```sql
SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
```

19× aufgerufen, 0.4ms avg — die Query selbst ist schnell, aber die schiere Frequenz ist auffällig. Passt zum 60s-Credit-Polling × Multi-Tab-Verstärkung aus 2b. **Wird durch Phase 1.4 (Polling weg) miterledigt.**

### Zu untersuchende Beobachtung

**ROLLBACK-Frequenz hoch.**
21 ROLLBACKs in der gleichen Periode. Mögliche Erklärungen:
- Drizzle/Neon-Treiber rollt Read-Only-Transaktionen implizit zurück (by-design, harmlos)
- Echte Fehler-Rollbacks (z.B. fehlgeschlagene Credit-Deductions in [`db.transaction()`](../../src/lib/db/queries/credits.ts))

Ohne zeitlich gefilterte Reproduktion nicht entscheidbar. **Markiert als Beobachtung, kein direkter Fix.**

### Verifikation

Für belastbare Per-Request-Zahlen — vor jeder weiteren DB-Analyse:

```sql
-- Stats zurücksetzen
SELECT pg_stat_statements_reset();
```

Dann **einen** definierten Test-Request absetzen (z.B. „Erklär in 3 Sätzen, was Prompt Engineering ist." als neuer Chat ohne Tool-Calls). Warten bis Stream + `after()`-Tasks durch sind, dann:

```sql
SELECT
  LEFT(query, 120) AS query_snippet,
  calls,
  ROUND(mean_exec_time::numeric, 2) AS avg_ms,
  ROUND(total_exec_time::numeric, 2) AS total_ms
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC;
```

Erwartung für eine saubere Vanilla-Chat-Anfrage: **~12-18 Queries**. Deutlich mehr → N+1 oder Cache-Miss.

### Fixes (in Phase 1 aufnehmen)

| # | Änderung | Datei | Effekt |
|---|----------|-------|--------|
| 1.8 | `knownUserIds`-Cache in gemeinsames Modul ziehen, auch von `page.tsx` und `design-library/page.tsx` nutzen | [`src/lib/api-guards.ts:12-37`](../../src/lib/api-guards.ts), [`src/app/page.tsx:27`](../../src/app/page.tsx), [`src/app/design-library/page.tsx:14`](../../src/app/design-library/page.tsx) | Reduziert User-Upserts auf 1× pro User pro Lambda-Lebensdauer, unabhängig vom Entry-Point |
| 1.9 | Index `idx_skills_active_user` auf `skills(is_active, user_id)` ergänzen | Drizzle-Migration in `drizzle/` | Discovery-Query von 4.3ms auf <1ms; einmaliger Effort, dauerhaft |

---

## 3. Root Causes

### 3.1 MCP-Allowlist greift nicht für Default-Experts

[`src/config/mcp.ts:135-152`](../../src/config/mcp.ts):

```ts
if (mcpServerIds && mcpServerIds.length > 0 && !mcpServerIds.includes(server.id)) return false
```

Wenn ein Expert keine `mcpServerIds` gepflegt hat (häufiger Default-Fall), greift der Filter **nicht** — alle Server, die ihren `envVar`-Gate bestehen, werden geladen. Strukturell falsche Semantik: `undefined`/`[]` heißt aktuell „alle", müsste aber „keine" heißen.

### 3.2 Context7 Transport falsch konfiguriert

`seeds/mcp-servers/context7.md` setzt `transport: http`. Die AI-SDK-MCP-Client-Bibliothek öffnet trotzdem einen SSE-GET als Fallback und kassiert pro Aufruf ~400ms 405-Latenz. Der Server spricht Streamable HTTP, was die AI-SDK-MCP-Client-API derzeit nicht als eigenen Typ kennt.

### 3.3 Sequenzielle Post-Response-Tasks

Zwei unabhängige Tasks (Title, Suggested-Replies) werden in zwei separaten `after()`-Aufrufen sequenziell ausgeführt. Verlängert die abgerechnete Function-Duration um ~2s pro Request — UX-irrelevant (Streaming ist beim User), aber kostenrelevant.

### 3.4 MCP-Verbindung pro Request neu

[`src/lib/mcp/index.ts:73-105`](../../src/lib/mcp/index.ts) baut für jeden Request neue Connections auf und schließt sie via `after()` wieder. Tool-Discovery (`tools/list`) ist deterministisch pro `MCPServerConfig` und ließe sich pro Lambda-Instanz cachen.

---

## 4. Exkurs — LLM-Agency und MCP-Discovery

Eine berechtigte Intuition: „Das LLM sollte doch selbst erkennen, welcher MCP-Server für diese Frage relevant ist, und nur den laden." Das stimmt **halb**.

**Was das LLM agentisch entscheidet:** Pro Step im Loop wählt es aus, welches Tool es aufruft. Tools, die es nicht braucht, ignoriert es. Das ist die agentische Fähigkeit.

**Was das LLM nicht kann:** Tools nutzen, die es nicht kennt. Damit es entscheiden kann, muss der Code im Voraus jedem Server `tools/list` abluchsen und die Tool-Schemas in den LLM-Request packen. Erst danach kann das Modell ein Tool aufrufen. Die Discovery-Calls sind also unvermeidlich — aber sie sind **cachebar oder vermeidbar**.

### Drei Patterns aus der Industrie (Stand 2026)

| Pattern | Wer nutzt das | Trade-off |
|---|---|---|
| **Eager + Cache** | Anthropic, Vercel AI SDK Default | Tools werden einmal entdeckt, dann für 5-15 min gecached. Pragmatisch, skaliert bis ~20 Server. |
| **Static Tool-Manifest** | Cursor, Continue.dev | Tool-Schemas in DB hinterlegt, keine Live-Discovery. Bricht das MCP-Versprechen, dass Server Tools dynamisch ändern dürfen. |
| **Two-Stage-Router** | Composio, manche LangGraph-Setups | Kleines Modell (Haiku, Flash) sieht nur Server-Namen + Kurzbeschreibung, wählt 1-3 Server, erst dann volle Discovery. Skaliert auf 50+ Server, kostet +200-500ms Latenz. |

### Konsequenz für build-jetzt

Bei aktuell 5 MCP-Servern ist **Eager + Cache** das billigste, schnellste und am wenigsten invasive Pattern. Two-Stage-Router lohnt erst ab ~20+ Servern, weil sonst die Router-Latenz teurer ist als die Discovery, die er einsparen soll.

---

## 5. Empfohlener Pfad

Zwei Phasen, jede als separater PR auslieferbar.

### Phase 1 — Quick Wins (≈ 4-6 Stunden)

| # | Änderung | Datei | Effekt |
|---|----------|-------|--------|
| ~~1.1~~ ✅ | Context7 in der DB deaktivieren — **erledigt 2026-05-21** durch manuelle Löschung im Admin | Admin-UI `/admin/mcp-servers` | Verifiziert im Multi-Tool-Log: context7-Calls sind weg, MCP-Liste jetzt 4 Server statt 5 |
| 1.2 | Title + Suggested-Replies in **einem** `after()` mit `Promise.all` parallelisieren | [`src/app/api/chat/persist/index.ts:118-132`](../../src/app/api/chat/persist/index.ts) | Function-Duration −2s (kostenrelevant) |
| 1.3 | Pro-Request-Logging: `[mcp] connected N servers in T ms` inkl. Server-IDs | [`src/lib/mcp/index.ts:73`](../../src/lib/mcp/index.ts) | Sichtbarkeit für künftige Regressionen + Baseline für Cache-Hit-Rate (Phase 2) |
| 1.4 | Credit-Polling abschalten — `setInterval` raus, nur noch `chat-updated`-Event reagiert | [`src/components/layout/credit-indicator.tsx:34`](../../src/components/layout/credit-indicator.tsx) | Eliminiert Hintergrund-Traffic von `/api/credits` (60-120/h pro Tab) komplett |
| 1.5 | "Neuer Chat" auf Soft-Navigation umstellen: `router.push("/")` statt `window.location.href = "/"` | [`src/components/layout/chat-header.tsx:40`](../../src/components/layout/chat-header.tsx) | Spart 4-5 Calls beim Klick, kein kompletter Client-Boot, gefühlt schnelleres Umschalten |
| 1.6 | `customInstructions` + `businessModeStatus` aus `page.tsx` als Props durchreichen, Client-Fetches entfernen | [`src/app/page.tsx`](../../src/app/page.tsx), [`src/components/chat/chat-view.tsx:197`](../../src/components/chat/chat-view.tsx), [`src/hooks/use-business-mode.ts:101`](../../src/hooks/use-business-mode.ts) | Spart 2 Calls beim Initial-Mount, schnellerer LCP, keine Client-Wartezeit auf Settings |
| 1.7 | Suggested-Replies-Polling bricht bei Auth-Failure (307/401/403) sofort ab, statt 3× zu retryen | [`src/components/chat/suggested-replies.tsx:26-43`](../../src/components/chat/suggested-replies.tsx) | Eliminiert 4-6 redundante Calls bei Cookie-Verlust |
| 1.8 | `knownUserIds`-Cache in gemeinsames Modul ziehen, auch von Server-Component-Pages nutzen | [`src/lib/api-guards.ts`](../../src/lib/api-guards.ts), [`src/app/page.tsx`](../../src/app/page.tsx), [`src/app/design-library/page.tsx`](../../src/app/design-library/page.tsx) | User-Upsert nur noch 1× pro Lambda-Lebensdauer, unabhängig vom Entry-Point |
| 1.9 | Index `idx_skills_active_user` auf `skills(is_active, user_id)` ergänzen | Drizzle-Migration | Discovery-Query von 4.3ms auf <1ms; einmaliger Effort |

### Empfohlene Umsetzungs-Reihenfolge

Nicht stur 1.2 → 1.3 → 1.4, sondern in drei Runden nach **Risiko × Wirkung × Aufwand**. Jede Runde kann als eigener PR raus.

**Runde A — Null Risiko, hohe Wirkung (≈ 1-2h)**

Isolierte Änderungen, die einzeln testbar sind und nichts an der Architektur ändern.

| Task | Warum jetzt |
|------|-------------|
| **1.4** Credit-Polling abschalten | Eine einzelne Datei, eliminiert sofort sichtbar Hintergrund-Traffic. Kein anderer Code hängt am Polling. |
| **1.7** Suggestions-Polling bei Auth-Fail stoppen | Kleine Änderung in einer Komponente, fixt einen offensichtlichen Bug. |
| **1.9** Skills-Index ergänzen | Reine DB-Migration, kein App-Code betroffen. Wirkt sofort dauerhaft. |

**Runde B — Kleines Risiko, hohe Wirkung (≈ 2-3h)**

Einfache Refactorings in klar umrissenen Funktionen.

| Task | Warum jetzt |
|------|-------------|
| **1.2** Title + Replies parallelisieren | Eine Funktion, klare Semantik. Spart die abgerechnete Function-Duration spürbar. |
| **1.3** MCP-Logging einbauen | Reines Logging, ändert kein Verhalten. **Baseline für Phase 2** — ohne das Logging können wir den Cache-Hit-Effekt später nicht messen. |
| **1.8** `ensureUserExists`-Cache gemeinsam nutzen | Wirkt App-weit, deshalb gründlich testen (Auth-Flows, Page-Mounts). |

**Runde C — Mehrere Files, mehr Risiko (≈ 2-3h)**

Änderungen, die Verhalten subtil verschieben können — hier braucht es manuelles QA.

| Task | Warum am Ende |
|------|---------------|
| **1.5** Soft-Navigation für „Neuer Chat" | Ändert die UX subtil — Sidebar-State, gemerkte Chat-Liste, ggf. Reset-Verhalten in `ChatView`. Manuell durchklicken. |
| **1.6** Instructions + Business-Mode als Server-Props | Berührt mehrere Files, Hydration-Reihenfolge muss stimmen. Risiko von Hydration-Mismatches bei abweichenden Server/Client-Werten. |

**Phase 2 (Tool-Cache) erst nach Phase-1-Stabilisierung**, damit der Effekt gegen eine saubere Phase-1-Baseline messbar ist (über das MCP-Logging aus 1.3).

### Phase 2 — Tool-Discovery-Cache (≈ 1-2 Tage)

Ziel: Bei warmer Lambda-Instanz fallen `tools/list`-Calls für die nächsten 10 min komplett weg.

| # | Änderung | Datei |
|---|----------|-------|
| 2.1 | Modul-Level-Cache `Map<serverId+url, { client, tools, expiresAt }>` mit 10 min TTL | Neuer Helper `src/lib/mcp/discovery-cache.ts` |
| 2.2 | `connectServer()` prüft Cache, ruft `createMCPClient` + `client.tools()` nur bei Miss | [`src/lib/mcp/index.ts:20-70`](../../src/lib/mcp/index.ts) |
| 2.3 | `close()` skippt Disconnect, solange Cache-Eintrag aktiv ist | [`src/lib/mcp/index.ts:91-103`](../../src/lib/mcp/index.ts) |
| 2.4 | Cache-Invalidierung bei Admin-MCP-Mutation (Add/Edit/Delete/Toggle) | `src/app/api/admin/mcp-servers/*` |
| 2.5 | Recherche-Check via context7 `/vercel/ai` → MCP-Lifecycle: Hält die AI-SDK-`createMCPClient`-Connection eine SSE-Verbindung wirklich offen oder reconnected sie pro Tool-Call? Ergebnis beeinflusst, ob 2.3 sinnvoll ist. | — |
| 2.6 *(optional)* | JWKS-Set zusätzlich in `unstable_cache` mit 1h TTL legen, damit auch Cold Starts den Auth-Server nicht remote treffen | [`src/lib/auth/oidc.ts:49-54`](../../src/lib/auth/oidc.ts) |

**Wichtig:** Der Cache lebt nur im Memory der Lambda-Instanz. Bei Cold Start neu aufgebaut — aber Vercel hält warme Instanzen typischerweise 5-15 min. Für parallele Instanzen (Skalierung) hat jede Instanz ihren eigenen Cache; akzeptabel.

---

## 6. Bewusst zurückgestellt

- **Allowlist-Verschärfung pro Expert** — wird durch Phase 1.1 (context7 raus) und Phase 2 (Cache macht Discovery billig) erstmal entlastet. Lohnt sich erst, wenn die MCP-Server-Liste über ~10 wächst oder bestimmte Server teure Tool-Calls auslösen.
- **Two-Stage-Router** — lohnt erst ab ~20+ MCP-Servern. Aktuell 4 (nach context7-Abschaltung). Router-Overhead wäre teurer als die Einsparung.
- **Title-Gen bei Folgenachrichten skippen** — denkbarer Mini-Win (Title wird ohnehin nur bei `isNewChat` gebraucht). Bereits durch existierende `isNewChat`-Prüfung in [`generateTitle`](../../src/app/api/chat/persist/post-response.ts) abgedeckt? — vor Phase 1.2 verifizieren.

---

## 7. Verifikation

### Nach Phase 1

- Vercel Runtime-Log Chat-Request: 26 → ~10 externe Calls
- Function-Duration laut Dashboard: 7.6s → ~5.5s
- Keine Regression in Title-/Suggested-Replies-Funktionalität (manuelle UI-Stichprobe)
- "Neuer Chat"-Klick: 8 → 3-4 Calls (nur noch echte Page-Daten, Sidebar bleibt warm)
- Initial-Load (frischer Tab auf `/`): 8 → 6 Calls (instructions + business-mode entfallen)
- Hintergrund-Polling auf `/api/credits` verschwindet vollständig aus dem Log

### Nach Phase 2

- Zweiter Chat-Request binnen 10 min auf warmer Instanz: MCP-Calls weiter reduziert auf 2-4 (nur echte Tool-Aufrufe, keine Discovery)
- Cache-Hit-Rate via `[mcp]`-Log nachvollziehbar
- Cold-Start-Verhalten dokumentiert (erster Request fühlt sich wie heute an, jeder weitere innerhalb 10 min ist deutlich schneller)
- Admin-Mutation an einem MCP-Server invalidiert Cache, sichtbar im Log

---

## 8. Risiken & offene Punkte

- **Phase 2.3 (skipped disconnect):** Falls AI-SDK pro Tool-Call intern reconnected, bringt das nichts. Recherche-Check 2.5 vor Implementierung.
- **Memory-Footprint:** Bei 10+ gecachten MCP-Clients pro Lambda-Instanz prüfen, ob Vercel-Memory-Limit (2048 MB) noch komfortabel ist. Aktuell 353 MB bei aktivem Request — viel Headroom.
- **Cache-Konsistenz:** Werden Tool-Schemas zur Laufzeit geändert, sieht der Cache das erst nach TTL-Ablauf. Invalidierung über Admin-Mutationen (2.4) deckt den Hauptfall ab.

---

## 9. Nächste Schritte

1. Dieses PRD im Team / mit Kollege durchgehen, Feedback einarbeiten
2. Weitere Analysen besprechen, bevor Phase 1 startet
3. Phase 1 als separater PR (Branch: `perf/chat-request-fanout-phase1`)
4. Phase 2 als separater PR (Branch: `perf/chat-request-fanout-phase2`)
