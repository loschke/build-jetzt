# Artifact-System in build.jetzt — Architektur-Übersicht

> Schulungsmaterial. Eine Seite, fünf Fragen, keine Code-Dumps. Quellen sind verlinkt auf Datei:Zeile.

---

## 1. Output-Format vom LLM

Das LLM erzeugt Artifacts als **strukturierten AI-SDK Tool-Call** namens `create_artifact`. Kein eigener XML-Wrapper, kein freies HTML im Text-Stream.

- **Definition:** `src/lib/ai/tools/create-artifact.ts:11-55` — Zod-Schema mit `type` (`"markdown" | "html" | "code"`), `title`, `content` (max 500.000 Zeichen), optional `language` und `sources[]`.
- **Execute-Seite:** Der `execute`-Callback läuft serverseitig in der Chat-Route, schreibt das Artifact direkt via `createArtifact()` in die DB (`src/lib/db/queries/artifacts.ts`) und gibt dem LLM nur Metadaten (`artifactId`, `version`) zurück. Der Content selbst wird vom AI SDK als Tool-Argument **gestreamt** — der Client sieht Tokens, sobald sie reinkommen.
- **Verwandte Tools:** `create_quiz`, `create_review`, `generate_image`, `deep_research`, `code_execution` schreiben ebenfalls Artifacts (jeweils eigener `type`).
- **Fallback für Models ohne Tool-Calling:** `src/lib/ai/tools/parse-fake-artifact.ts` parst nach Stream-Ende JSON-Marker im Volltext und re-injiziert einen synthetischen Tool-Call. Aufgerufen aus `src/app/api/chat/persist/assemble-parts.ts:59-112`.

## 2. Rendering im Client

HTML-Artifacts werden in einem **`<iframe srcDoc=...>`** gerendert — kein Shadow DOM, kein direktes DOM-Inject (`src/components/assistant/html-preview.tsx:36-46`).

- **Sandbox-Attribute:** `sandbox="allow-scripts allow-popups"`. Bewusst **ohne** `allow-same-origin`, `allow-forms`, `allow-top-navigation` — das iframe hat damit einen `null`-Origin und keinen Zugriff auf Cookies, localStorage oder den Parent-DOM.
- **CSP-Injection:** Vor dem Mount wird via `injectCsp()` ein `<meta http-equiv="Content-Security-Policy">` in den `<head>` injiziert. Vorhandene CSP-Tags des LLM werden **gestrippt**, damit das Modell die Policy nicht überschreiben kann (`html-preview.tsx:5-16`).
- **Andere View-Typen** (`src/types/artifact.ts:2`): `markdown` (Streamdown), `code` (Shiki-Highlighting), `quiz`/`review` (React-State-Renderer), `image` (Gallery), `audio` (typisiert, Renderer noch nicht implementiert). Nur HTML läuft im iframe — alles andere rendert React kontrolliert.

## 3. Was darf ein Artifact

| Capability | Erlaubt? | Wodurch begrenzt |
| --- | --- | --- |
| Inline `<script>` ausführen | Ja | `script-src 'unsafe-inline'` |
| Externe Scripts laden | Whitelist | nur `cdn.tailwindcss.com` + `cdnjs.cloudflare.com` |
| Externe Styles / Fonts | Whitelist | `fonts.googleapis.com` / `fonts.gstatic.com` |
| Bilder | Liberal | `data:`, `blob:`, alle `https:` |
| `fetch` / XHR | Eng | nur `cdn.tailwindcss.com` (`connect-src`) |
| postMessage → Parent | Technisch ja, faktisch nein | Parent registriert keinen Listener — Nachrichten verpuffen |
| Cookies / localStorage | Nein | `null`-Origin durch fehlendes `allow-same-origin` |
| Forms abschicken | Nein | `allow-forms` nicht gesetzt |
| Popups | Ja | `allow-popups` |
| State persistieren | Nein | iframe-State stirbt beim Re-Render des `srcDoc` |

## 4. Trust-Modell

**Wir vertrauen Sandbox + CSP, nicht dem LLM-Output.** Es gibt **keine DOMPurify- oder sanitize-html-Schicht** — das HTML wird unverändert (außer dem CSP-Strip) in `srcDoc` geschoben.

- Schutz beruht auf zwei Schichten: (a) der Browser-Sandbox (Origin-Isolation), (b) der eigenen CSP.
- **Bekannte Lockerheit:** `'unsafe-inline'` für `script-src`. Das ist nötig, damit LLM-generierte `<script>`-Tags überhaupt laufen — bedeutet aber, dass innerhalb des Sandbox-iframes jeder JS-Code ausführbar ist. Akzeptabel, weil das iframe sonst nichts erreichen kann.
- Print-Iframes (PDF-Export, `artifact-panel.tsx:232/299`) laufen mit `sandbox="allow-modals"` — separater, minimaler Kontext nur für `window.print()`.

## 5. Begrenzungen (was ein Artifact heute nicht kann)

- **Keine User-Daten:** kein Zugriff auf Auth, Memory, Profil, andere Chats.
- **Kein Tool-Recall:** das LLM kann das Artifact nach Erstellung nur über `read_artifact` (textbasiert) wieder einlesen — das Artifact selbst kann keine Tools triggern.
- **Keine Inter-Artifact-Kommunikation:** jedes HTML-Artifact ist eine eigene Sandbox-Insel.
- **Keine Echtzeit-Backend-Calls:** `connect-src` lässt nur Tailwind-CDN durch — kein Aufruf der eigenen `/api/*`.
- **Keine Persistenz aus dem iframe:** kein localStorage, kein IndexedDB (null-Origin); Editier-Workflow läuft serverseitig über `versioned update` der DB-Spalte.
- **Annahme (nicht primärquellen-verifiziert):** Die Print-Iframes erben CSP nur, wenn `injectCsp()` auch dort aufgerufen wird — falls Schulungsteilnehmer fragen, hier vor Ort kurz nachsehen.

---

## Verifikation für die Schulung

- `src/lib/ai/tools/create-artifact.ts` — Tool-Schema live zeigen
- `src/components/assistant/html-preview.tsx` — CSP + Sandbox-Zeile vorführen
- DevTools im Chat öffnen → iframe inspizieren → Sandbox-Attribute & injected CSP-Meta zeigen
- Demo: ein HTML-Artifact mit `<script>fetch('/api/user/me')</script>` schreiben → CSP-Block in der Konsole sichtbar
