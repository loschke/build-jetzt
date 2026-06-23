# PRD: Generisches Rendering von MCP-Tool-Outputs (MCP Apps + Content-Fallback)

> **Status:** Entwurf zur Besprechung
> **Erstellt:** 2026-06-20
> **Schwester-PRD:** `prd-mcp-oauth-account-auth.md` (liefert die per-User authentifizierten MCP-Verbindungen)
> **Ziel:** So generisch wie möglich — out-of-the-box für möglichst viele MCP-Server, kein Code pro Server.

---

## 1. Kontext & Problem

Seit dem OAuth-MCP-Feature können User externe MCP-Dienste (Neon, Vercel, Higgsfield, …) mit ihrem
eigenen Konto verbinden. Die Tools laufen im Chat. **Aber:** Ergebnisse werden nur **generisch** als
zusammenklappbare Status-Zeile gerendert (`ToolStatus`), weil die Renderer-Registry (`tool-renderers.tsx`)
nur **eingebaute** Tools abdeckt. Jedes MCP-Tool ist ein `dynamic-tool` → Fallback ohne Bild/Media/Widget
(`isGenericToolPart` in `chat-message.tsx`).

**Konkretes Symptom (Higgsfield):** Bildgenerierung läuft, gibt aber `status: pending` + Job-ID zurück
(asynchron). In **Claude Desktop** erscheint stattdessen ein **interaktives Widget** mit dem fertigen Bild
und Steuerung (Referenz: `docs/higgsfield-in-claude-screen.png`). Das ist **MCP Apps**.

### Gewünschtes Ergebnis

Eine **einmalige, generische** Host-Implementierung, die interaktive MCP-Widgets und reiche Tool-Outputs
rendert — sodass jeder konforme MCP-Server (heute und künftig) ohne server-spezifischen Code funktioniert.

---

## 2. Standard-Analyse: MCP Apps (verifiziert)

**MCP Apps** ist die **erste offizielle MCP-Extension** (SEP-1865, offiziell seit **26.01.2026**).
Unterstützt von Claude/Claude Desktop, VS Code Copilot, ChatGPT, Goose, Postman u. a.

**Mechanismus:**
1. Ein Tool deklariert UI über `_meta.ui.resourceUri` → zeigt auf eine **`ui://`-Resource**.
2. Der Host **liest** diese Resource (HTML, oft mit gebündeltem JS/CSS; externe Origins via `_meta.ui.csp`).
3. Der Host rendert das HTML in einem **sandboxed iframe**. `_meta.ui` kann `permissions` (Kamera/Mikro)
   und `csp` enthalten.
4. **Bidirektional**: JSON-RPC über `postMessage` (eigener MCP-Dialekt) — geteilt (`tools/call`),
   ähnlich (`ui/initialize`), neu (`ui/`-Prefix). Host **pusht** das Tool-Ergebnis ins App-iframe; die App
   kann **Tools aufrufen**, Kontext aktualisieren, Daten empfangen. **Die App pollt selbst** (z. B.
   `job_status`) — deshalb zeigt Higgsfield das fertige Bild, obwohl der erste Call „pending" war.

**Host-Optionen (SDK):**
- **AppBridge** aus `@modelcontextprotocol/ext-apps` — übernimmt iframe-Rendering, Message-Passing,
  Tool-Call-Proxying, Security-Policy. Referenz: `examples/basic-host`.
- **`@mcp-ui/client`** — React-Komponenten zum Rendern/Interagieren (von MCP-UI-Org).
- Oder das postMessage-Protokoll direkt (kein Dependency-Zwang).

**Quellen:**
- https://modelcontextprotocol.io/extensions/apps/overview
- https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865 (SEP-1865)
- https://apps.extensions.modelcontextprotocol.io/api/ (`@modelcontextprotocol/ext-apps`, AppBridge)

---

## 3. SDK-Lage im Projekt (geprüft)

| Fähigkeit | Status |
|---|---|
| `_meta` auf MCP-Tools (für `_meta.ui.resourceUri`) | ✅ `@ai-sdk/mcp` liefert `McpToolBase._meta` (Runtime-Befüllung noch zu verifizieren) |
| `ui://`-Resource lesen (`readResource`) | ⚠️ `@ai-sdk/mcp` **hat es nicht**; **`@modelcontextprotocol/sdk`** (transitiv, v1.x) **hat `readResource`** → direkter Client nötig |
| Sandboxed iframe + CSP-Injection | ✅ existiert bereits für Artifacts (`HtmlPreview`, `sandbox="allow-scripts"` + CSP Meta-Tag) |
| AppBridge / `@mcp-ui/client` | ➕ neue Dependency (zu evaluieren) |

---

## 4. Architektur-Entscheidung: zwei Ebenen, generisch

**Leitprinzip: einmal bauen, alle konformen Server profitieren.** Zwei sich ergänzende Ebenen:

### Ebene A — Generischer Content-Renderer (breite Abdeckung, kein Security-Risiko)
Rendert die typisierten `content[]`-Teile **jedes** MCP-Ergebnisses: `text` → Markdown, `image`
(base64/URL) → `<img>`, `resource`/Audio → Player. Deckt alle Server ab, die Inhalte **direkt** liefern.
Reuse vorhandener Renderer (ImagePreview, AudioPlayer). **Kein** Widget, **kein** Async-Poll.

### Ebene B — MCP-Apps-Host (der eigentliche generische Gewinn)
Erkennt `_meta.ui.resourceUri` auf Tool/Ergebnis → liest die `ui://`-HTML-Resource → rendert sie im
**sandboxed iframe** → verdrahtet die **postMessage/JSON-RPC-Bridge** (AppBridge), sodass die App das
Tool-Ergebnis empfängt, **selbst pollt** und (Phase 3) **Tools zurückruft** — geroutet über die
**per-User authentifizierte MCP-Verbindung** aus dem OAuth-Feature. Damit rendert **jeder**
MCP-Apps-konforme Server (inkl. Higgsfield) ohne server-spezifischen Code.

> Server, die **weder** saubere `content`-Typen **noch** MCP Apps liefern, bleiben beim heutigen
> `ToolStatus`-Fallback. Kein bespoke Code pro Server — bewusst.

---

## 5. Umzusetzende Bausteine

1. **MCP-Resource-Zugriff:** `ui://`-Resources über `@modelcontextprotocol/sdk`-Client (`readResource`)
   lesbar machen — entweder den Underlying-Client aus `@ai-sdk/mcp` abgreifen oder für UI-Server einen
   direkten SDK-Client halten. `_meta.ui` aus `client.tools()` durchreichen (heute verworfen).
2. **Dynamic-Tool-Renderer für MCP Apps:** In `tool-renderers.tsx`/`chat-message.tsx` einen Pfad
   ergänzen: hat das `dynamic-tool` ein `_meta.ui` → `<McpAppFrame>` mounten (statt `ToolStatus`).
3. **`McpAppFrame`-Komponente:** sandboxed iframe (Reuse `HtmlPreview`-Sandbox/CSP-Pattern) + AppBridge-
   Anbindung (Message-Passing, Tool-Result-Push, Security-Policy).
4. **Tool-Call-Proxy (Phase 3):** API-Route, die App-initiierte `tools/call` über die **authentifizierte**
   Verbindung des Users ausführt (mit Consent/Capability-Gating). Löst das Lifecycle-Problem (s. u.).
5. **Ebene-A-Content-Renderer:** generischer Renderer für `content[]` (text/image/audio/resource).
6. **Feature-Gate + EU/Local-Kompat:** Rendering ist client-seitig; `ui://`-HTML kann externe Scripts
   (per `csp`) laden → hinter Flag + strikte CSP, EU/Local-Profile berücksichtigen.

---

## 6. Auswirkungen & Risiken

### 🟢 Additiv
- Neuer Render-Zweig; bestehende Tool-Renderer + statischer `ToolStatus`-Fallback unverändert.
- Reuse des vorhandenen sandboxed-iframe/CSP-Stacks.

### 🟡 Echte Herausforderungen
1. **Verbindungs-Lifecycle (kritisch).** MCP-Verbindungen werden heute **pro Request** aufgebaut und in
   `persist.ts` (finally) geschlossen. Ein interaktives App-iframe braucht aber einen **lebenden Kanal**
   für `tools/call`/Polling **nach** der Antwort. → Dedizierte Route, die pro App-Call frisch (authentifiziert)
   verbindet, statt die Request-Verbindung offenzuhalten. Architektur-Kernstück.
2. **Sicherheit: fremdes HTML im iframe.** Drittanbieter-HTML rendern → strikte Sandbox (kein
   `allow-same-origin` Richtung Host), CSP, Capability-Gating, **Consent** für app-initiierte Tool-Calls.
   Tool-Calls laufen über die **eigene** authentifizierte Verbindung → dürfen nie fremde Scopes treffen.
3. **SDK-Unbekannte.** Befüllt `@ai-sdk/mcp` `_meta` zur Laufzeit? Reicht `readResource` des Underlying-
   Clients durch? → Spike vor Phase 2.
4. **EU/Local.** `ui://`-HTML kann externe Origins laden → CSP/Flag, damit Local-Profile dicht bleiben.

### Nicht gefährdet
Chat-Kern, OAuth-Connect, statische MCP-Server, bestehende Tool-Renderer.

---

## 7. Implementierungs-Reihenfolge (iterativ)

1. **Spike (0.5 Tag):** Befüllt `@ai-sdk/mcp` `_meta.ui`? Liest der Underlying-/SDK-Client `ui://`?
   Was liefert Higgsfield konkret (vollständiges Result + UI-Resource)?
2. **Phase 1 — Ebene A:** generischer `content[]`-Renderer (text/image/audio). Sofort-Mehrwert, kein
   Security-Risiko. Deckt Server ab, die Inhalte direkt liefern.
3. **Phase 2 — MCP-Apps-Host read-only:** `ui://` lesen + sandboxed iframe rendern + Tool-Result pushen.
   Widget + Bild erscheinen; App pollt selbst. **Noch kein** Tool-Call-Back.
4. **Phase 3 — bidirektional:** Tool-Call-Proxy über authentifizierte Verbindung + Consent + Lifecycle-Route.

---

## 8. Offene Fragen

- [ ] Spike-Ergebnis: `_meta`/`readResource` über `@ai-sdk/mcp` vs. direkter `@modelcontextprotocol/sdk`.
- [ ] AppBridge (`@modelcontextprotocol/ext-apps`) vs. `@mcp-ui/client` vs. hand-rolled — Bundle/Maintenance.
- [ ] Lifecycle: dedizierte „App-Tool-Call"-Route — pro Call frisch verbinden (Latenz) vs. Session-Pooling
      (Komplexität, Cross-User-Risiko — siehe OAuth-PRD: keine Handles cachen).
- [ ] Persistenz: sollen App-Ergebnisse (z. B. generierte Bilder) nach R2 persistiert werden (vergängliche
      Anbieter-URLs)? Überschneidung mit der Asset-Handling-Frage aus dem OAuth-PRD (§10).
- [ ] EU/Local: striktes CSP-Profil; welche externen Origins erlaubt?

---

## 9. Verifizierung (End-to-End)

1. Higgsfield-Bildgenerierung → Widget rendert im Chat, pollt selbst, zeigt fertiges Bild (wie Claude Desktop).
2. Ein zweiter MCP-Apps-Server (z. B. ein `ext-apps`-Beispiel) rendert **ohne** zusätzlichen Code.
3. Server **ohne** MCP Apps, der `image`-Content liefert → Bild via Ebene A sichtbar.
4. Server ohne UI/Content → unveränderter `ToolStatus`-Fallback, kein Crash.
5. Security: iframe ohne Host-DOM/Cookie-Zugriff; app-initiierter Tool-Call nur mit Consent + über die
   eigene authentifizierte Verbindung; CSP blockt nicht-erlaubte Origins.
6. Ohne Feature-Flag / im Local-Profil: kein externes Laden, Chat unverändert.
