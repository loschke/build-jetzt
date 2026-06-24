# MCP Apps Host — Referenz & Build-Guide

> **Zweck:** Alles, was eine andere Session wissen muss, um (a) den MCP-Apps-Host in build-jetzt zu
> verstehen und (b) eine **eigene MCP App** zu bauen, die out-of-the-box damit läuft.
> **Status:** PoC, auf `main`, hinter Flag (default aus). Higgsfield läuft live wie in Claude Desktop.
> **Verwandte Docs:** `docs/ideas/prd-mcp-apps-rendering.md` (PRD), `docs/ideas/spike-mcp-apps-sdk.md`
> (SDK-Spike + Verifikationen), `docs/ideas/mcp-apps-review.md` (Security-/Correctness-Review).

---

## 1. Was ist umgesetzt

Zwei sich ergänzende Ebenen, die MCP-Tool-Ergebnisse reich rendern (statt nur generischem `ToolStatus`):

| Ebene | Was | Flag | Default |
|---|---|---|---|
| **A** | Direktes Bild/Audio aus `content[]` jedes MCP-Tools rendern | `NEXT_PUBLIC_MCP_RICH_OUTPUT` | **an** |
| **B** | Interaktiver **MCP-Apps-Host** (SEP-1865): `ui://`-Widgets im sandboxed iframe, Tool-Calls proxied | `NEXT_PUBLIC_MCP_APPS_ENABLED` | **aus** |

**Voraussetzungen für Ebene B:** `MCP_ENABLED=true`, `MCP_TOKEN_ENCRYPTION_KEY` (OAuth-MCP), der Server als
MCP-Server registriert + verbunden, Flag an. Diagnose: `NEXT_PUBLIC_MCP_APPS_DEBUG=true`.

---

## 2. Architektur (Ebene B)

```
Tool-Definition hat _meta.ui.resourceUri ("ui://server/widget.html")
   │
   ├─ Client lädt Map  →  GET /api/mcp/app-tools   (verbindet kurz, liest _meta.ui, 60s-Cache)
   │                       { "server__tool": { serverId, resourceUri } }
   │
chat-message.tsx erkennt dynamic-tool-Part mit ui:// + Result da
   │  → mountet <McpAppFrame> (dynamic import, ssr:false)
   │
McpAppFrame:
   1. POST /api/mcp/app-resource { serverId, uri }  → Widget-HTML (über User-Verbindung gelesen)
   2. Bridge (AppBridge, null-Client, MINIMAL_CAPS) verbinden  ──┐ VOR srcdoc (Handshake-Race!)
   3. iframe.srcdoc = injectWidgetCsp(html)  (sandbox, opaque origin)
   4. on "initialized": sendToolInput(input) → sendToolResult(output)
   5. Widget rendert + pollt selbst:
        tools/call  → oncalltool  → POST /api/mcp/app-call { serverId, toolName, arguments }
                                     → fresh connect über User-OAuth → tool.execute → close
        ui/message  → onmessage   → sendMessage({text}) in den Chat  (recreate/animate/edit/upscale)
        ui/download-file, ui/open-link → Host-Handler
```

**Hot-Path bewusst unangetastet:** Chat-Route / `build-tools` / `persist` bleiben unverändert. Die
`_meta.ui`-Map kommt über die separate `app-tools`-Route, nicht über den Chat-Stream → null Regressionsrisiko.

### Datei-Map
| Zweck | Datei |
|---|---|
| Ebene-A-Extractor (Bild/Audio aus content[]) | `src/lib/ai/mcp-content.ts` + `src/components/chat/mcp-rich-result.tsx` |
| `_meta.ui`-Extractor (rein, testbar) | `src/lib/mcp/ui-apps.ts` |
| Server-Ops: `readUiResource` + `callAppTool` | `src/lib/mcp/app-host.ts` |
| Roher Single-Server-Client (für readResource/execute) | `connectMcpClient` in `src/lib/mcp/index.ts` |
| Routen | `src/app/api/mcp/{app-resource,app-call,app-tools}/route.ts` |
| Host-iframe-Komponente (AppBridge + CSP + Handler) | `src/components/chat/mcp-app-frame.tsx` |
| Client-Hook (Map, 1 Fetch, Modul-Cache) | `src/hooks/use-mcp-app-tools.ts` |
| Detection + Mount | `src/components/chat/chat-message.tsx` (`renderMcpAppFrame`) |
| `ui/message` → Chat | `src/components/chat/chat-view.tsx` (`handleAppMessage`) |
| Flags | `src/config/features.ts` |
| Poll-Rate-Limit-Bucket | `src/lib/rate-limit.ts` (`RATE_LIMITS.mcpPoll`) |

---

## 3. Host-Capabilities (was der Host kann / nicht kann)

Annonciert in `MINIMAL_CAPS` (`mcp-app-frame.tsx`):

| Capability | Methode | Verhalten im Host |
|---|---|---|
| `serverTools` | `tools/call` | Proxied an den Server über die **per-User-OAuth-Verbindung** (`/api/mcp/app-call`) |
| `message` | `ui/message` | Text (≤2000 Zeichen) → neuer **User-Turn** im Chat → Agent reagiert |
| `downloadFile` | `ui/download-file` | Blob/ResourceLink-Download (Dateiname sanitized) |
| `openLinks` | `ui/open-link` | `window.open` für http(s) |
| `logging` | `notifications/message` | (nur Diagnose) |
| — | `ui/request-display-mode` | wird beantwortet (inline/fullscreen) |

**NICHT annonciert → darauf NICHT bauen:**
- ❌ `sampling/createMessage` (kein Host-LLM-Zugriff)
- ❌ `serverResources` (`resources/read`/`list`/`subscribe` aus dem Widget)
- ❌ `updateModelContext` (wird nicht gespeichert → Agent kennt „aktuelles Bild" nicht)

Push Host→Widget: `toolInput` + `toolResult` (einmal nach init), `sizechange` setzt iframe-Höhe.

---

## 4. Sicherheits-/Lifecycle-Modell
- **iframe**: `sandbox="allow-scripts allow-popups allow-downloads allow-forms"`, **kein** `allow-same-origin`
  → opaque Origin, kein Zugriff auf Host-DOM/Cookies/Token.
- **Verbindung**: pro App-Call **frisch** verbunden + geschlossen, **nie gepoolt/gecacht** (Cross-User-Leak-Schutz,
  OAuth-PRD). Latenz pro Poll ist der bewusste Trade-off (das `tools/list`-Relisting ist vom `@ai-sdk/mcp`-SDK
  erzwungen — kein direktes `callTool`).
- **Scoping**: Widget erreicht nur **seinen eigenen** Server (Single-Server-Connect) + dessen `enabledTools`.
- **Permissions-Policy**: nur `clipboardWrite` durchgereicht (kein Kamera/Mikro/Geo).
- **Rate-Limit**: eigener `mcpPoll`-Bucket (120/min), getrennt vom Chat.

---

## 5. Eine eigene MCP App bauen (Server-Seite)

### 5.1 Tool mit UI-Resource deklarieren
Das Tool, dessen Ergebnis ein Widget zeigen soll, bekommt `_meta`:
```jsonc
// Tool-Definition (nested-Format bevorzugt)
{ "name": "generate_thing", "inputSchema": {...},
  "_meta": { "ui": { "resourceUri": "ui://meinserver/widget.html" } } }
```

### 5.2 Die `ui://`-Resource bereitstellen
`resources/read` für diese URI gibt **self-contained HTML** zurück:
```jsonc
{ "contents": [{ "uri": "ui://meinserver/widget.html",
                 "mimeType": "text/html;profile=mcp-app",
                 "text": "<!DOCTYPE html> … (inline gebündelt) …" }] }
```
Optional: `_meta.ui.csp.connectDomains` / `resourceDomains` / `permissions` auf dem Content-Item deklarieren,
wenn das Widget externe Origins braucht (s. CSP unten).

### 5.3 Das Widget (App-Seite, im HTML)
Nutze das **App-SDK** `@modelcontextprotocol/ext-apps` (App-Klasse — **nicht** AppBridge, das ist der Host):
```js
import { App, PostMessageTransport } from "@modelcontextprotocol/ext-apps"
const app = new App({ name: "Mein Widget", version: "1.0.0" },
                    { availableDisplayModes: ["inline", "fullscreen"] })
app.ontoolresult = (result) => renderFrom(result)      // Host pusht das Tool-Ergebnis
app.ontoolinput  = (input)  => showPrompt(input)
await app.connect(new PostMessageTransport(window.parent, window.parent))
// Aktionen:
await app.callTool({ name: "job_status", arguments: { id } })   // Polling/Job-Pattern
await app.sendMessage({ role: "user", content: [{ type: "text", text: "animate this image" }] })
await app.requestDownload({ contents: [...] })
```
Alles inline bündeln (Vite/esbuild → single HTML). **Keine** externen `<script src=https://…>` (CSP-blockiert).

### 5.4 Async-/Job-Pattern (wie Higgsfield)
Tool gibt sofort `pending` + Job-ID zurück → Host pusht das als `toolResult` → Widget **pollt selbst** einen
Status-Tool via `app.callTool({name:"job_status", …})` (über den Host proxied) bis fertig → rendert das Bild.
Wichtig: Das Widget rendert **schema-getrieben** aus dem echten Result — Schema muss konsistent sein.

### 5.5 Registrieren + aktivieren
- Server in build-jetzt anlegen (`seeds/mcp-servers/*.md` oder Admin-UI), `authType: oauth` oder `static`.
- **`enabledTools` setzen** (sonst sind ALLE Tools app-aufrufbar — noch kein Consent, s. Limitierungen).
- `NEXT_PUBLIC_MCP_APPS_ENABLED=true` + Server verbinden.

---

## 6. CSP & Sandbox (sonst bricht's still)
Der Host injiziert eine CSP ins Widget-HTML (`injectWidgetCsp`):
```
default-src 'none';
script-src 'unsafe-inline' data: blob: <resourceDomains>;   ← KEIN remote https: (alles inline bündeln)
style-src  'unsafe-inline' data: blob: <resourceDomains>;
img-src    data: blob: https: <resourceDomains>;            ← Remote-CDN-Bilder ok
media-src  data: blob: https: <resourceDomains>;
font-src   data: <resourceDomains>;
connect-src 'none' | <connectDomains>;                      ← kein fetch/XHR, außer deklariert
```
Konsequenzen fürs Widget-Design:
- **Inline** alles (Scripts/Styles). Remote-Scripts werden geblockt.
- **Kein `fetch`/XHR/WebSocket** — Daten über `tools/call` holen, **oder** `_meta.ui.csp.connectDomains` deklarieren.
- Bilder/Videos via Remote-`https:` (CDN) sind ok.

---

## 7. Gelernte Fallstricke (Host-Seite, schon gelöst — gut zu wissen)
- **Handshake-Race:** Host muss die Bridge verbinden **bevor** das Widget-HTML lädt, sonst geht `ui/initialize`
  verloren (Widget timeoutet mit `-32001`). Erledigt in `McpAppFrame`. Die App-Seite (App.connect) ist davon nicht betroffen.
- **Self-contained Pflicht** wegen CSP (s. o.).
- **Breite:** Widget rendert in einem `w-fit`-Message-Container → der Frame erzwingt volle Breite (`w-[60rem] max-w-full`).
- **Höhe:** Widget sollte `ui/notifications/size-changed` senden; sonst Default 360px.
- **Schema-getrieben:** Fake-/falsche Result-Daten → leeres/fehlerhaftes Rendering. Produktiv fließt das echte
  Server-Result 1:1 durch.

---

## 8. Debug
`NEXT_PUBLIC_MCP_APPS_DEBUG=true` (+ Redeploy) aktiviert:
- Client: `window.__MCP_APP_LOG` (Phasen-Log, gecappt) + `[McpApp +Nms] …` in der Konsole.
- Server: `[MCP-App] readResource.ok/callTool.ok … connectMs/listMs/execMs` in den Function-Logs.
Ohne Flag: still (nur Fehler werden geloggt). Praktisch zum Nachvollziehen, welche Methode ein Widget-Button auslöst.

---

## 9. Bekannte Limitierungen (Tier-3 / M2.5, bewusst offen)
- **Kein Consent / Default-Allow** für app-Tool-Calls: ein Widget kann jedes Tool seines Servers (wenn
  `enabledTools` leer) mit beliebigen Args aufrufen. → Für **untrusted** Server erst Consent/Default-Deny bauen.
- `updateModelContext` (welches Bild ist „aktuell"), `sampling` (Host-LLM), volle Geste/Consent bei
  `ui/message`/Download, Bild-URLs nach R2 persistieren (vergängliche CDN-URLs), Poll-Backoff.
- Residual: gehärtete CSP erlaubt weiter `img-src https:` → theoretischer img-Beacon-Exfil (akzeptiert unter
  semi-trusted-Server-Modell, da Server keine `resourceDomains` deklarieren).

---

## 10. Referenzen
- Offiziell: https://modelcontextprotocol.io/extensions/apps/overview · SEP-1865 · `@modelcontextprotocol/ext-apps`
  (App = Widget-Seite, AppBridge = Host-Seite; `examples/basic-host`).
- Intern: `docs/ideas/spike-mcp-apps-sdk.md` (alle SDK-/Live-Verifikationen), `docs/ideas/mcp-apps-review.md`
  (Security-Review + was umgesetzt ist), `docs/ideas/prd-mcp-apps-rendering.md` (PRD).
