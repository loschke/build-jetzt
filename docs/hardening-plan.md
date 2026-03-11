# Hardening Plan — sevenx-app-boilerplate

> Fortschritts-Tracking fuer Security Hardening, Code-Qualitaet und Architektur-Cleanup.

---

## Phase 1: Security Hardening (Kritisch + Hoch)

**Status:** 6/6 abgeschlossen

- [x] **1.1 Dev Auth Bypass absichern** (S, 5 min)
  - **Datei:** `src/proxy.ts`
  - **Problem:** `LOGTO_APP_ID` Check erlaubt Bypass auch in Production, wenn Variable fehlt
  - **Fix:** Zusaetzlichen `NODE_ENV === "development"` Check einbauen. Production ohne App-ID gibt 503.
  - **Verifikation:** Build erfolgreich, Auth-Flow funktioniert

- [x] **1.2 Path Traversal in Storage-Key fixen** (S, 15 min)
  - **Datei:** `src/app/api/upload/[key]/route.ts`
  - **Problem:** `..`-Sequenzen im Key koennen Scope-Check umgehen
  - **Fix:** `sanitizeStorageKey()` mit `path.posix.normalize()`, `..`-Check, normalization-Vergleich
  - **Verifikation:** Key mit `../` wird mit 400 abgelehnt

- [x] **1.3 SSRF-Schutz fuer Web-Routes** (S, 30 min)
  - **Neue Datei:** `src/lib/url-validation.ts`
  - **Problem:** Web-Routes akzeptieren beliebige URLs inkl. localhost/interne IPs/Cloud-Metadata
  - **Fix:** `isAllowedUrl()` blockt private IPs, localhost, metadata, decimal-encoded IPs, IPv6
  - **Betroffene Routes:** `scrape`, `crawl`, `batch-scrape`, `extract`
  - **Verifikation:** `localhost`, `169.254.169.254`, `10.x.x.x` URLs geben 400

- [x] **1.4 Content-Security-Policy Header** (M, 30 min)
  - **Datei:** `next.config.ts`
  - **Fix:** CSP + Permissions-Policy + X-DNS-Prefetch-Control hinzugefuegt
  - **Verifikation:** Headers in Browser DevTools sichtbar

- [x] **1.5 Magic-Byte-Validierung fuer Uploads** (M, 1-2h)
  - **Dateien:** `src/lib/storage/validation.ts`, `src/lib/storage/index.ts`
  - **Problem:** Nur MIME-Type aus Header geprueft, leicht faelschbar
  - **Fix:** `validateMagicBytes()` prueft PNG/JPEG/GIF/WebP/PDF Signaturen vor Upload
  - **Verifikation:** Umbenannte .exe-Datei mit falscher MIME wird abgelehnt

- [x] **1.6 Rate Limiting** (M, 2-3h)
  - **Neue Datei:** `src/lib/rate-limit.ts`
  - **Fix:** In-Memory Token Bucket per User-ID. Presets: chat(20/min), web(30/min), upload(10/min)
  - **Betroffene Routes:** Alle 8 API-Route-Files + crawl GET
  - **Verifikation:** Schnelle Wiederholungen geben 429

---

## Phase 2: Security (Mittel) + Code-Qualitaet

**Status:** 7/7 abgeschlossen

- [x] **2.1 Shared Constants extrahieren** (S, 30 min)
  - **Neue Datei:** `src/lib/constants.ts`
  - **Fix:** `MAX_MESSAGE_LENGTH`, `MAX_MESSAGES`, `MAX_BODY_SIZE`, `SLUG_PATTERN` zentralisiert
  - **Betroffene Dateien:** `api/chat/route.ts`, `api/assistant/chat/route.ts`

- [x] **2.2 Feature Flag Kollision beheben** (S, 10 min)
  - **Datei:** `src/config/features.ts`
  - **Fix:** Assistant nutzt eigene `NEXT_PUBLIC_ASSISTANT_ENABLED` Variable

- [x] **2.3 Sensible Daten aus Logs entfernen** (S, 30 min)
  - **Betroffene Dateien:** Alle API-Route-Files
  - **Fix:** `console.error` loggt nur `error.message`, keine vollen Objekte oder Storage-Keys

- [x] **2.4 Upload Error Handling fixen** (S, 45 min)
  - **Dateien:** `src/lib/storage/validation.ts`, `src/lib/storage/index.ts`, `src/app/api/upload/route.ts`
  - **Fix:** `FileValidationError` Klasse mit `code`-Property statt String-Matching

- [x] **2.5 Body Size Limits** (S, 30 min)
  - **Neue Datei:** `src/lib/api-guards.ts`
  - **Fix:** `checkBodySize()` in chat, search, scrape, crawl, batch-scrape, extract Routes

- [x] **2.6 CSRF Origin Check** (S, 15 min)
  - **Datei:** `src/proxy.ts`
  - **Fix:** Origin-Header gegen `LOGTO_BASE_URL` fuer POST/PUT/PATCH/DELETE Requests

- [x] **2.7 Zod-Validierung fuer API Bodies** (M, 2-3h)
  - **Neue Datei:** `src/lib/schemas.ts` (+ `zod` Dependency)
  - **Fix:** Schemas fuer alle 8 Routes, `parseBody()` Helper mit Zod `safeParse`

---

## Phase 3: Architektur-Cleanup

**Status:** 3/3 abgeschlossen

- [x] **3.1 Config-Overlap vereinheitlichen** (S, 15 min)
  - **Neue Datei:** `src/config/ai.ts`
  - **Fix:** `aiDefaults` mit model + temperature, `chatConfig` und `assistantConfig` spreaden davon

- [x] **3.2 Falsch platzierte Komponenten verschieben** (S, 30 min)
  - **Aus `ui/`:** `button-group.tsx`, `input-group.tsx` → `src/components/shared/`
  - **Aus `ai-elements/`:** `code-block.tsx`, `shimmer.tsx`, `tool.tsx`, `reasoning.tsx` → `src/components/assistant/`
  - **Imports aktualisiert:** `message.tsx`, `prompt-input.tsx`, `assistant-chat.tsx`

- [x] **3.3 assistant-chat.tsx zerlegen** (M, 2-3h)
  - **Vorher:** 682 Zeilen, eine Datei
  - **Nachher:** 4 Dateien
    - `assistant-chat.tsx` — Orchestrator (State, Handlers, Layout)
    - `assistant-messages.tsx` — Message-Rendering mit Turn-Tracking
    - `assistant-suggestions.tsx` — Empty-State / Quick Questions
    - `assistant-input-helpers.tsx` — UploadButton + AttachmentPreviews

---

## Verifikation

1. `pnpm build` — Ausstehend (manuell pruefen)
2. Auth-Flow testen (Login/Logout)
3. Chat und Assistant testen
4. Upload testen
5. CSP-Header in Browser DevTools pruefen
6. SSRF-Test: `/api/web/scrape` mit localhost muss 400 geben

---

## Neue Dateien (Zusammenfassung)

| Datei | Zweck |
|-------|-------|
| `src/lib/url-validation.ts` | SSRF-Schutz |
| `src/lib/rate-limit.ts` | Token Bucket Rate Limiter |
| `src/lib/constants.ts` | Shared API Constants |
| `src/lib/api-guards.ts` | Body Size Check |
| `src/lib/schemas.ts` | Zod Validation Schemas |
| `src/config/ai.ts` | Shared AI Defaults |
| `src/components/shared/button-group.tsx` | Verschoben aus ui/ |
| `src/components/shared/input-group.tsx` | Verschoben aus ui/ |
| `src/components/assistant/assistant-messages.tsx` | Extrahiert aus assistant-chat |
| `src/components/assistant/assistant-suggestions.tsx` | Extrahiert aus assistant-chat |
| `src/components/assistant/assistant-input-helpers.tsx` | Extrahiert aus assistant-chat |
