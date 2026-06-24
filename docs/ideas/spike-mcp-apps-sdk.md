# Spike-Memo: MCP-Apps SDK-Lage (M0)

> **Status:** Code-Spike + Live-Probe + Degradierungs-Test abgeschlossen · **Datum:** 2026-06-24
> **Gehört zu:** `prd-mcp-apps-rendering.md` (M0 aus dem Review-Plan)
> **Ergebnis:** 🟢 **GO — kein Stop-Kriterium gefunden.** Higgsfields echtes Widget initialisiert + degradiert
> sauber im strikten Sandbox über AppBridge mit minimalen Capabilities. `generation.html` braucht **kein**
> sampling/subscribe → die „persistente Session"-Sorge entfällt für den Headline-Fall. Verbleibender Aufwand
> ist bekannte, begrenzte Engineering-Arbeit (s. Kostenbild unten), kein offenes Risiko.

---

## TL;DR

`@ai-sdk/mcp` v1.0.25 kann **alles, was MCP Apps braucht** — `_meta` auf Tools, `readResource`,
typisierte `content[]`. **Kein paralleler `@modelcontextprotocol/sdk`-Client nötig.** Die PRD-Annahme
(§3: „`@ai-sdk/mcp` hat `readResource` nicht") ist für v1.0.25 **veraltet**.

Higgsfield nutzt **Standard-SEP-1865** (`ui://` + `mcp-app`-Profil), voll self-contained, Daten nur über die
Bridge → generischer Host valide, CSP tight. **Aber:** Das volle Widget will eine *persistente* Session
(`subscribe`/`sampling`) — Konflikt mit „nie poolen". Lösung: minimale `hostCapabilities` annoncieren →
Degradierung auf `tools/call`-Polling. **Nächster Test:** degradiert das Widget sauber?

---

## Befunde (am Code/SDK verifiziert)

### 1. `_meta` auf Tool-Definitionen überlebt ✅
`@ai-sdk/mcp` hängt `_meta` an jedes Tool aus `client.tools()`:
`node_modules/.../@ai-sdk/mcp/dist/index.mjs:1928` → `tools[name] = { ...toolWithExecute, _meta }`.
Typ: `McpToolBase` hat `_meta?: ToolMeta` (`index.d.ts:253`); `ListToolsResult.tools[]._meta` ist
`Record<string, unknown>` (`index.d.ts:309`). Unser Wrapper erhält `_meta` über Spread
(`src/lib/mcp/index.ts:62`) und `Object.assign` (`:114`).
→ **`_meta.ui.resourceUri` ist zur Registrierungszeit in `build-tools.ts` greifbar.**

### 2. `readResource` ist nativ auf dem `@ai-sdk/mcp`-Client ✅ (PRD-Korrektur)
`MCPClient` bietet direkt: `readResource({uri})`, `listResources()`, `listResourceTemplates()`
(`index.d.ts:482-492`, Impl `index.mjs:1969-1979`). `ReadResourceResult` liefert `contents[]` mit
`text`/`blob` + `mimeType` (`index.d.ts:369-385`).
→ **Kein zweiter SDK-Client, keine Doppelverbindung.** Annahme 2b im Review entschärft.

### 3. Tool-Ergebnis trägt `content[]` + `_meta` ✅
Die `execute`-Funktion gibt den **vollen `CallToolResult`** zurück (`index.mjs:1908`), wenn kein
`outputSchema` (= der `dynamicTool`-Pfad, den MCP-Tools nutzen). `CallToolResult` =
`{ _meta?, content[] (text|image|resource), structuredContent?, isError? }` (`index.d.ts:326-357`).
→ **Ebene A (M1) rendert aus `part.output.content[]`** — Daten sind da, kein Server-spezifischer Code.

### 4. Model- vs. UI-Output sind getrennt ✅
`toModelOutput: mcpToModelOutput` (`index.mjs:1564`) projiziert für das **Modell** nur `text` +
`image-data`. Der für die UI gespeicherte `output` bleibt der rohe `CallToolResult`.
→ Das Modell bekommt Bilder bereits in den Kontext; die reiche UI baut auf dem rohen Output.

---

## Was im Code noch fehlt (für die Milestones)

| Milestone | Lücke | Ort |
|---|---|---|
| M1 (Ebene A) | `_meta` ist erhalten; Client muss `part.output.content[]` reich rendern statt JSON-Dump. **Ein Runtime-Check:** persistiert die AI-SDK den vollen `output` im `dynamic-tool`-Part? | `chat-message.tsx`, `tool-renderers.tsx`, `persist/index.ts` |
| M2 (Host) | Wrapper exponiert den `client` **nicht** (nur `close` fängt ihn). Für `readResource`/Tool-Call-Proxy muss `connectServer`/`MCPHandle` den Client (oder `readResource`/`callTool`-Fn) durchreichen; `_meta` pro Tool ablegen. | `src/lib/mcp/index.ts` |

---

## Live-Probe gegen echten Higgsfield-MCP (durchgeführt 2026-06-24)

Geprüft über die MCP-Resource-Tools gegen den live verbundenen Higgsfield-Server. Da `ui://`-Resources +
Tool-`_meta` **server-definiert** sind, gilt das Ergebnis host-unabhängig (auch für build-jetzt).

### 🟢 GO-Signale
1. **Standard, nicht proprietär.** Higgsfield exponiert 9 `ui://`-Resources mit `mimeType:
   text/html;profile=mcp-app` (`generation.html`, `job-list.html`, `media-upload.html`, …) — exakt SEP-1865.
2. **Voll self-contained.** `generation.html` ist eine ~1 MB React-SPA, **inline** gebündelt (`<script type=module>`),
   **keine** externen `<script src>`/`<link>`/`import(url)`. → **tight CSP machbar**, EU/Local bleibt dicht.
3. **Daten nur über die Bridge.** Keine hartcodierten API-Origins im Bundle. Die App holt alles via
   `tools/call`/`resources/read` über den Host — **nicht** per Direkt-Fetch zur Higgsfield-API.
   `img-src https:` (dynamische Bild-URLs aus Tool-Results) genügt netzseitig.
4. **Display-Modi `inline` + `fullscreen`** deklariert die App selbst (`availableDisplayModes`).
   → mappt sauber auf unsere Chat-inline- bzw. Artifact-Panel-Surface; Entscheidung damit entschärft.
5. **Capability-Negotiation vorhanden.** App liest `hostCapabilities`/`hostContext` aus `ui/initialize` und
   hat `fallback`-Pfade → **wir können den Funktionsumfang nach unten verhandeln.**

### 🔴 Kosten-/Stop-Signale (früh, wie gewünscht)
1. **Protokoll ist groß.** Die App erwartet ~20 Methoden: `tools/list|call`, `resources/list|read|templates|
   subscribe|unsubscribe`, `sampling/createMessage`, `roots/list`, `ui/initialize|update|message|request|
   resource|open|download|notifications/*` + viele `notifications/*`. → **Hand-rolled ist unrealistisch;
   AppBridge ist faktisch Pflicht** (bestätigt die Entscheidung, ist aber eine harte Dependency).
2. **⚠️ Kern-Konflikt: Die volle App will eine *persistente, bidirektionale* Session.** `resources/subscribe`
   + `sampling/createMessage` + Live-`tools/call` widersprechen direkt der OAuth-PRD-Regel „pro Call frisch
   verbinden, **nie poolen, keine Handles cachen**". Eine echte Subscription braucht einen **lebenden Kanal**,
   kein One-Shot. → **Auflösung:** im `ui/initialize` **minimale `hostCapabilities`** annoncieren (nur
   `tools/call`, **kein** subscribe/sampling) → App degradiert auf Polling via `tools/call`.
   **Noch zu verifizieren:** degradiert Higgsfields Widget wirklich sauber? Wenn nicht → echter Stop-Punkt.
3. **`sampling/createMessage`** = das Widget kann **unser** LLM aufrufen. Initial **nicht** annoncieren
   (Consent-/Kosten-/Missbrauchs-Fläche). Erst später hinter Gate + `resolveModel()`.
4. **~1 MB Widget pro Instanz, minifiziert/opak.** Nicht auditierbar → **strikte iframe-Sandbox ohne
   `allow-same-origin` ist die einzige Verteidigung**. Performance: lazy mounten, Panel/fullscreen bevorzugen,
   **nicht** in der Scrollback-History mounten.

### Push-/Pull-Modell (bestätigt)
- **Host → Widget:** Events `toolinput`, `toolresult`, `toolcancelled`, `hostcontextchanged` (via `ui/notifications`).
  Das fertige Bild kommt also per `toolresult`-Push **nach** dem initialen `pending` — bestätigt Anmerkung 2a:
  Higgsfield-Bild erscheint nur mit lebendem `tools/call`-Pfad (Polling), nicht read-only.
- **Widget → Host:** `tools/call`, `resources/read`, `ui/request` (über die per-User-Verbindung).

## Degradierungs-Test mit echtem Widget (durchgeführt 2026-06-24)

Billigster Test, der das Feature hätte killen können: Higgsfields **echtes** `generation.html` (1 MB) in
einem **strikten Sandbox-iframe** (`sandbox="allow-scripts"`, **kein** `allow-same-origin`), getrieben über
die **offizielle AppBridge** (`@modelcontextprotocol/ext-apps@1.7.4`) mit **minimalen** Host-Capabilities
(`serverTools` + `logging`, **kein** sampling/subscribe/resources/message). Harness:
`scratchpad/mcp-apps-probe/` (host-entry.js + AppBridge, via esbuild gebündelt, im echten Browser per Playwright).

**Ergebnis — kein Stop-Kriterium gefunden:**
| Prüfpunkt | Ergebnis |
|---|---|
| Lädt im strikten Sandbox (allow-scripts, kein same-origin)? | ✅ ja |
| `ui/initialize`-Handshake über AppBridge? | ✅ ja (167–199 ms), App meldet sich als „Higgsfield AI 1.0.0" |
| Degradiert bei **minimalen** hostCapabilities (kein sampling/subscribe)? | ✅ ja — kein Crash, kein Hängen, keine Anforderung verbotener Capabilities |
| `sampling/createMessage` / `resources/*` vom Widget verlangt? | ✅ **nein** — wurde nie aufgerufen → die „persistente Session"-Sorge trifft `generation.html` nicht |
| Host→Widget Push (`sendToolInput`/`sendToolResult`)? | ✅ akzeptiert, Widget reagiert (size-changed) |
| Fehler/Abstürze? | ✅ keine (nur favicon-404) |

**Einschränkung des Tests:** Das Widget rendert die Generierungs-Card **schema-getrieben** — mit *gefälschtem*
Result-Schema rendert es leer (32 px → 0 px). **Das ist kein Blocker:** Produktiv fälschen wir nichts, sondern
**proxien das echte `tools/call` an den echten Higgsfield-Server und reichen dessen `CallToolResult` 1:1 durch**
→ Schema passt per Konstruktion (wie in Claude Desktop). Ein echtes Bild im Widget bräuchte nur echte
Higgsfield-Daten (read-only `show_*`-Call oder echte Generierung) — nicht nötig für die Machbarkeits-Frage.

**Nebengewinn:** Die AppBridge bietet eine offizielle **Double-iframe-Sandbox** (`onsandboxready` +
`sendSandboxResourceReady({html, sandbox})`) — der sanktionierte Weg, 1 MB opakes Fremd-HTML sicher in einen
inneren `allow-scripts`-Frame zu laden. Direkt als Basis für `McpAppFrame` nutzbar. Der Harness ist der
lauffähige Prototyp.

## Empfehlung fürs Re-Scope von M2
**M2a (realistisch):** Widget rendern + `toolresult` pushen + **scoped** `tools/call`-Polling über
fresh-per-call-Route; minimale `hostCapabilities` (kein subscribe/sampling). Surface: Panel/fullscreen.
**Gate:** Verifizieren, dass das Widget bei minimalen Capabilities degradiert — **das ist der nächste,
billigste Test und der ehrliche Go/No-Go für die Higgsfield-Headline.**
**M2b (später, optional):** persistente Session für subscribe/sampling — nur wenn der Mehrwert die
Lifecycle-/Security-Kosten rechtfertigt.

---

## Auswirkung auf den Plan

- **M0 Code-Spike: erledigt.** Architektur-Go steht; „paralleler SDK-Client" gestrichen.
- **M1 (Ebene A)** kann starten — Datenpfad ist bestätigt, nur ein Persistenz-Check offen.
- **M2** braucht zusätzlich die Live-Probe oben, bevor AppBridge/Surface final verdrahtet werden.
