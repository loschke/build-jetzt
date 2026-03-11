# CLAUDE.md

> Projektkontext für Claude Code. Dieses Dokument beschreibt Architektur, Konventionen und Hintergrund des Projekts.

---

## Projekt-Überblick

**Repository:** `sevenx-app-boilerplate`
**Zweck:** Wiederverwendbare App-Shell unter der sevenX Dachmarke. Wird für jede neue App geklont und mit eigener Navigation/Content befüllt.
**Aktuell:** Demo-Navigation mit Platzhalter-Inhalten der AI-Design App.

### lernen.diy Plattform

lernen.diy ist eine Plattform für praxisorientierte KI-Lernmodule. Jedes Modul (z.B. "AI-Design", "Prompt Engineering") läuft als eigene App auf einer Subdomain:

- `lernen.diy` — Hub/Startseite (Astro, separates Repo)
- `ai-design.lernen.diy` — Erste Lern-App (dieses Skeleton)
- `auth.lernen.diy` — Logto OIDC (Custom Domain, kein eigener Code)
- `assets.lernen.diy` — Cloudflare R2 Public Bucket

Alle Apps teilen sich dieses Skeleton als Basis: gleiche Shell, gleiche Auth, gleiche UI-Sprache.

---

## Tech Stack

| Komponente | Technologie                         | Hinweise                                           |
| ---------- | ----------------------------------- | -------------------------------------------------- |
| Framework  | **Next.js 16** (App Router)         | Immer App Router, kein Pages Router                |
| Sprache    | **TypeScript**                      | Strict mode, keine `any` Types                     |
| Styling    | **Tailwind CSS v4** + **shadcn/ui** | Light mode only (kein Dark Mode)                   |
| Auth       | **Logto** (`@logto/next`)           | OIDC via `auth.lernen.diy`, Server Actions Pattern |
| Datenbank  | **Neon** (Serverless Postgres)      | Via **Drizzle ORM**                                |
| Storage    | **Cloudflare R2**                   | S3-kompatible API, `@aws-sdk/client-s3`            |
| Web        | **Firecrawl**                       | Search, Scrape, Crawl, Extract via SDK             |
| AI SDK     | **Vercel AI SDK**                   | `useChat` + `DefaultChatTransport` für Chat         |
| Markdown   | **Streamdown** + Plugins            | Streaming-optimiert, ersetzt react-markdown         |
| AI Components | **Vercel AI Elements**           | shadcn/ui-Pattern, lokale Kopien                   |
| Deployment | **Vercel**                          | Ein Projekt pro Subdomain                          |

---

## Coding-Konventionen

### TypeScript

- **Strict mode** aktiv. Keine `any` Types, außer in absoluten Ausnahmen mit `// eslint-disable-next-line` und Begründung.
- Interfaces für Props, Config-Objekte und API-Responses definieren.
- Zod für Runtime-Validierung von externen Daten (API Responses, Form Input).
- Utility Types (`Pick`, `Omit`, `Partial`) nutzen statt Typen zu duplizieren.

### Komponenten

- **Server Components** als Default. `"use client"` nur wenn nötig (Event Handler, Hooks, Browser APIs).
- Client Components so klein wie möglich halten. Die Server Component rendert Layout und Daten, die Client Component nur den interaktiven Teil.
- Props-Interface immer direkt über der Komponente definieren, nicht in separater Datei.
- shadcn/ui Komponenten NICHT modifizieren. Stattdessen Wrapper-Komponenten bauen die shadcn/ui Primitives zusammensetzen.

```typescript
// ✅ Gut: Wrapper um shadcn/ui
function AppButton({ children, ...props }: ButtonProps) {
  return <Button variant="outline" size="sm" {...props}>{children}</Button>;
}

// ❌ Schlecht: shadcn/ui Quelldatei editieren
```

### Dateistruktur

- `src/app/` — Nur Routing und Layouts. Minimale Logik.
- `src/components/` — Wiederverwendbare UI-Komponenten.
- `src/components/ui/` — shadcn/ui generiert. Nicht manuell ändern.
- `src/components/ai-elements/` — AI Elements (wie shadcn/ui, nicht manuell ändern).
- `src/components/layout/` — App-Shell Komponenten (Sidebar, Header etc.).
- `src/lib/` — Utilities, DB-Client, Auth-Helper.
- `src/lib/web/` — Firecrawl-Client und Types (Search, Scrape, Crawl, Extract, Map).
- `src/lib/storage/` — R2-Client, Upload-Validierung und Types.
- `src/config/` — Konfigurationsdateien (Navigation, Apps, Features, Chat). **Navigation und Apps werden pro App ausgetauscht.**
- `src/types/` — Geteilte TypeScript-Definitionen.

### Naming

- Dateien: `kebab-case.tsx` (Next.js Konvention)
- Komponenten: `PascalCase`
- Funktionen/Variables: `camelCase`
- Konstanten: `UPPER_SNAKE_CASE` nur für echte Konstanten (ENV, Magic Numbers)
- CSS Klassen: Tailwind Utilities, keine Custom Classes außer in `globals.css`

### Imports

- Absolute Imports via `@/*` Alias (zeigt auf `src/`)
- Reihenfolge: React/Next → External Libraries → Internal (`@/`) → Relative (`./`)
- Keine Default Exports außer für Page/Layout Komponenten (Next.js Anforderung)

```typescript
// ✅ Import-Reihenfolge
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

import { ModuleCard } from "./module-card";
```

### Error Handling

- Async Operationen immer mit try/catch.
- User-facing Errors: Klare deutsche Fehlermeldungen, keine technischen Details.
- Next.js `error.tsx` Boundaries in relevanten Route-Segmenten.
- `loading.tsx` für Suspense-States in jeder Route.

### Performance

- Images über `next/image` mit definierten Dimensions.
- Dynamische Imports (`next/dynamic`) für schwere Client Components.
- Keine Client-Side Data Fetching wenn Server Components möglich.
- `Suspense` Boundaries für granulares Streaming.

---

## Auth (Logto)

### Pattern: Server Actions

Diese App nutzt das `@logto/next` **Server Actions Pattern** für App Router. Das ist wichtig — es gibt ein älteres Pages Router Pattern das hier NICHT verwendet wird.

### Kernfunktionen

```typescript
import { getLogtoContext } from "@logto/next/server-actions";  // Auth-Status prüfen
import { signIn, signOut } from "@logto/next/server-actions";  // Login/Logout
import { handleSignIn } from "@logto/next/server-actions";     // Callback
```

### Auth-Flow

1. User besucht `/` (Landing Page, public)
2. User klickt "Jetzt starten" → Redirect zu Sign-In
3. Proxy (`proxy.ts`) prüft Session-Cookie bei `(app)` Routes
4. Wenn keine Session: Redirect zu `auth.lernen.diy` (Logto Hosted UI)
5. User loggt sich ein (Email OTP)
6. Logto redirected zurück zu `/api/auth/callback`
7. `handleSignIn()` tauscht Code gegen Token
8. Session Cookie wird gesetzt
9. User wird zu `/(app)/` weitergeleitet

### Auth-Architektur

- `/` → **Public** (Landing Page, kein Auth)
- `/(app)/*` → **Protected** (Auth required, Proxy Guard)
- `/api/auth/*` → **Public** (Auth-Endpoints müssen erreichbar sein)
- **Dev-Bypass:** Wenn `LOGTO_APP_ID` nicht gesetzt → alles frei zugänglich

### Proxy (statt Middleware)

Next.js 16 hat `middleware.ts` durch `proxy.ts` ersetzt:
- Datei: `src/proxy.ts` (im Projekt-Root oder `src/`)
- Export: `export function proxy()` (nicht `middleware()`)
- Runtime: Node.js (Default, besser für Auth-Checks als Edge)

### User-Identität

Logto liefert den User via `claims` in `getLogtoContext()`. Die `sub` Claim ist die Logto User ID und wird als Foreign Key in der lokalen Datenbank verwendet. Nie eine eigene User-ID generieren — immer `claims.sub` als Referenz nutzen.

### User-Helper (`src/lib/auth.ts`)

Zwei Funktionen für unterschiedliche Performance-Anforderungen:

- **`getUser()`** — Nur Token-Claims, kein HTTP-Call. Für Sidebar, Header, Auth-Guards.
- **`getUserFull()`** — Mit `fetchUserInfo: true`, HTTP-Call zu Logto. Nur wo vollständige Profildaten nötig (z.B. Profil-Seite).

### Auth-Route Error Handling

`signIn()`, `signOut()` und `handleSignIn()` rufen intern Next.js `redirect()` auf, das eine Exception wirft. In try/catch-Blöcken muss der Redirect-Throw re-thrown werden:

```typescript
try {
  await signIn(logtoConfig, { ... })
} catch (error) {
  // Next.js redirect() wirft mit digest-Property — re-throw
  if (error && typeof error === "object" && "digest" in error) throw error
  redirect("/")
}
```

---

## Datenbank (Neon + Drizzle)

### Drizzle ORM Konventionen

- Schema in `src/lib/db/schema.ts` definieren
- Migrations via `drizzle-kit generate` + `drizzle-kit migrate`
- Für schnelles Prototyping: `drizzle-kit push` (direkt Schema pushen ohne Migration)
- Relations über Drizzle Relations API definieren, nicht raw SQL

### Schema-Design

- Jede Tabelle hat `id` (UUID), `createdAt`, `updatedAt`
- User-Referenz immer über `logtoId` (text, unique), NICHT über Logto interne UUID
- Business-Daten (Credits, Fortschritt, generierte Inhalte) liegen in der App-DB, NICHT bei Logto

---

## Styling

### Theme (Light / Dark Mode)

Die App unterstützt Light und Dark Mode via `next-themes` mit class-basiertem Switching.

- **Feature Flag:** `NEXT_PUBLIC_DARK_MODE` (opt-out, default enabled)
- **Default Theme:** `NEXT_PUBLIC_DEFAULT_THEME` (`"light"` | `"dark"` | `"system"`, default `"light"`)
- `globals.css` definiert Light-Variablen in `:root` und Dark-Variablen in `.dark` (+ je 5 Brand-Selektoren)
- `next-themes` ThemeProvider in `src/components/theme-provider.tsx` (wraps children nur wenn Feature aktiv)
- ThemeToggle Button im Header (`src/components/layout/theme-toggle.tsx`)
- `suppressHydrationWarning` auf `<html>` (required by next-themes)
- Tailwind v4: CSS-first mit `@theme` Direktiven (kein `tailwind.config.ts`)

### Farben

Primärfarben werden über shadcn/ui CSS Custom Properties gesteuert. Für lernen.diy Apps:

- Primary: Blau/Teal-Bereich (vertrauenswürdig, lernorientiert)
- Akzent: Kann pro App variieren
- Sidebar: Leicht getönter Hintergrund, nicht reinweiß

### Responsive Breakpoints

- Mobile: `< 768px` (Sidebar als Sheet)
- Tablet: `768px – 1023px` (Sidebar collapsed)
- Desktop: `≥ 1024px` (Sidebar expanded)

---

## AI-Stack (Streamdown + AI Elements)

### Streamdown

Streaming-Markdown-Renderer, löst das Problem unvollständiger Markdown-Syntax während AI-Streaming.

- **Packages:** `streamdown`, `@streamdown/code`, `@streamdown/mermaid`, `@streamdown/cjk`, `@streamdown/math`
- **`isAnimating`-Prop** steuert Streaming-Verhalten (Cursor, partielle Syntax-Toleranz)
- **Tailwind-Klassen:** Safelist-Datei `src/lib/streamdown-safelist.ts` (Tailwind scannt src/ automatisch)
- **KEIN `@source` für node_modules!** Die `@source`-Direktive auf `node_modules` crasht Turbopack auf Windows (versucht Windows-Devicename `nul` zu lesen). Bei Änderungen am Streamdown-Klassen-Set die Safelist-Datei aktualisieren.
- **Styles:** `import "streamdown/styles.css"` in `layout.tsx`
- **Turbopack-Cache:** Bei unerklärlichen CSS-Fehlern `.next/` löschen (persistenter Cache kann stale Referenzen enthalten)
- Docs: https://streamdown.ai/docs

### Vercel AI Elements

shadcn/ui-basierte Komponenten für AI-UIs, installiert als lokale Kopien (wie shadcn/ui).

- **Installationsort:** `src/components/ai-elements/`
- **Verfügbare Komponenten:** `PromptInput`, `Message`, `Conversation`
- **`MessageResponse`** nutzt intern Streamdown mit allen Plugins (code, mermaid, math, cjk)
- **Neue Komponenten hinzufügen:** `npx ai-elements@latest add <component>`
- AI Elements NICHT manuell ändern. Stattdessen Wrapper-Komponenten bauen.
- Docs: https://ai-elements.dev/docs

### Chat-Architektur

Der Chat basiert auf AI Elements Komponenten:

```
ChatPanel → Conversation + ConversationContent (auto-scroll, stick-to-bottom)
              → Message + MessageContent + MessageResponse (Streamdown intern)
              → ConversationScrollButton
          → PromptInput + PromptInputTextarea + PromptInputSubmit
          → ChatSuggestions (custom, als Empty-State)
```

Beibehalten als Custom-Komponenten:
- `chat-provider.tsx` — Panel open/close State (nicht Chat-State)
- `chat-trigger.tsx` — Header-Button zum Öffnen
- `chat-suggestions.tsx` — Quick Questions (kein AI-Elements-Equivalent)

### Chat Prose-Typografie

Streamdown rendert semantisches HTML, Tailwind Preflight entfernt alle Default-Margins. Für lesbaren Chat-Output gibt es eine scoped `.chat-prose` CSS-Klasse in `globals.css`:

- **Anwendung:** `className="chat-prose"` auf `MessageResponse` in `chat-panel.tsx`
- **Scope:** Nur Chat-Ausgabe, nicht global. Kein `@tailwindcss/typography` nötig.
- **Enthält:** Line-height (1.65), Heading-Hierarchie, List-Marker/Spacing, Tabellen, Inline-Code, Blockquotes, Links, HR
- **Code-Blöcke:** Separates Styling via `[data-streamdown="code-block"]` Selektoren (ebenfalls in `globals.css`)

Bei Styling-Anpassungen am Chat-Output: `globals.css` Sektionen "Streamdown Prose Typography" und "Streamdown Code Block Overrides" bearbeiten.

---

## Chat Assistant (Fullpage)

Zusaetzlich zum Sidebar-Chat gibt es einen Fullpage-Assistenten unter `/assistant` mit Expertenrollen und Artifact-Panel.

### Architektur

| | Sidebar-Chat | Assistant |
|---|---|---|
| Route | Panel in App-Shell | `/assistant` eigene Page |
| Kontext | Modul-spezifisch (guides) | Experten-spezifisch (assistants) |
| API | `/api/chat` | `/api/assistant/chat` |
| Layout | 600px Panel | Fullpage, zweispaltig |

### Content-Struktur (Claude Projects Prinzip)

```
src/content/assistants/
├── {expert-slug}/
│   ├── system.md              <- Systemprompt
│   ├── knowledge/             <- Knowledge-Basis (.md Files)
│   │   └── thema.md
│   └── config.json            <- Metadaten (Name, Emoji, Beschreibung, Suggestions)
```

**Prompt-Assembly:** `system.md` + alle `knowledge/*.md` Files werden konkateniert, aehnlich wie Claude Projects den Knowledge-Block aufbaut.

### API-Routes

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/assistant/chat` | POST | Chat mit Experten-Kontext |
| `/api/assistant/experts` | GET | Liste verfuegbarer Experten |

### Artifact-Panel

- Oeffnet sich rechts neben dem Chat bei langen Nachrichten (> 500 Zeichen)
- **View Mode**: Streamdown rendert Markdown (MessageResponse)
- **Edit Mode**: CodeMirror mit Markdown-Syntax-Highlighting
- Aktionen: Kopieren, Download als .md
- Kein Sync zurueck zur Nachricht

### File-Uploads

User koennen Bilder und textbasierte Dateien im Chat hochladen. Dateien werden als **Inline Data URLs** uebertragen (kein R2 Storage noetig).

- **Erlaubte Typen:** PNG, JPEG, WebP, GIF, PDF, Markdown, Plaintext
- **Limits:** Max 4MB pro Datei, max 5 Dateien pro Nachricht, ~8MB Body-Limit
- **Ablauf:** PromptInput konvertiert Blob-URLs zu Data-URLs beim Submit. `convertToModelMessages()` transformiert FileUIParts zu base64 fuer Claude.
- **Vision:** Claude Sonnet 4.6 versteht Bilder nativ (Vision API)
- **PDFs:** Claude parsed PDFs nativ, kein Textextract noetig
- **Config:** `assistantConfig.upload` in `src/config/assistants.ts`
- **Validierung:** Client-seitig (accept, maxFileSize, maxFiles via PromptInput) + Server-seitig (MIME-Type Allowlist, Body-Size Check in API-Route)
- **Komponenten:** AI Elements `Attachments` fuer Previews im Input und in gesendeten Nachrichten

### Config

- `src/config/assistants.ts` — Model, Defaults, Navigation-Toggle, Upload-Config
- Feature-Flag: Gebunden an `NEXT_PUBLIC_CHAT_ENABLED` (gleich wie Sidebar-Chat)
- Persistenz: Session-only, kein DB-Schema

---

## Web Services (Firecrawl)

Infrastruktur fuer Websuche, Scraping, Crawling und strukturierte Datenextraktion. Aktiviert per Feature-Flag wenn `FIRECRAWL_API_KEY` gesetzt.

### Client (`src/lib/web/`)

Wrapper um `@mendable/firecrawl-js` SDK mit eigener Type-Abstraktionsschicht:

| Funktion | SDK-Methode | Verhalten | Credits |
|----------|-------------|-----------|---------|
| `webSearch(params)` | `firecrawl.search()` | Sync, direkte Response | ~2 / 10 Ergebnisse |
| `webScrape(params)` | `firecrawl.scrape()` | Sync, direkte Response | 1 / Seite |
| `webCrawl(params)` | `firecrawl.crawl()` | Blockierend mit Auto-Polling | 1 / Seite |
| `webCrawlAsync(params)` | `firecrawl.startCrawl()` | Non-blocking, gibt Job-ID | 1 / Seite |
| `webCrawlStatus(id)` | `firecrawl.getCrawlStatus()` | Job-Status abfragen | 0 |
| `webBatchScrape(params)` | `firecrawl.batchScrape()` | Batch, blockierend | 1 / URL |
| `webExtract(params)` | `firecrawl.extract()` | Strukturierte LLM-Extraktion | 5 / URL |
| `webMap(params)` | `firecrawl.map()` | Sitemap-Discovery | 1 / Call |

### API-Routes (`/api/web/`)

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/web/search` | POST | Websuche (optional mit Scraping) |
| `/api/web/scrape` | POST | Einzelne URL scrapen |
| `/api/web/crawl` | POST | Crawl-Job starten (async) |
| `/api/web/crawl?jobId=xxx` | GET | Crawl-Status abfragen |
| `/api/web/batch-scrape` | POST | Mehrere URLs auf einmal scrapen |
| `/api/web/extract` | POST | Strukturierte Daten aus URLs |

Alle Routes pruefen Feature-Flag, Auth und validieren Input (URL-Pattern, Query-Laenge, Array-Limits).

### Types (`src/lib/web/types.ts`)

Eigene Interfaces als Abstraktionsschicht ueber dem SDK. Bei SDK-Breaking-Changes nur `src/lib/web/index.ts` anpassen.

---

## Storage (Cloudflare R2)

File-Upload/Download via `@aws-sdk/client-s3`. Aktiviert per Feature-Flag wenn `R2_ACCESS_KEY_ID` gesetzt.

### Client (`src/lib/storage/`)

| Funktion | Beschreibung |
|----------|-------------|
| `uploadFile(file, userId, options?)` | Upload mit Validierung (Typ, Groesse, Filename) |
| `deleteFile(key)` | Datei loeschen |
| `getSignedDownloadUrl(key)` | Signed URL fuer private Dateien (1h) |
| `listFiles(prefix?)` | Dateien auflisten |

### Validierung (`src/lib/storage/validation.ts`)

- MIME-Type Allowlist: png, jpg, webp, gif, pdf, markdown, plaintext
- Extension-Blocklist: exe, bat, cmd, js, sh etc.
- Filename: nur `[a-zA-Z0-9._-]`
- Max 10MB Default (konfigurierbar per `UploadOptions`)
- Storage-Key: `uploads/{userId}/{nanoid}-{sanitized-filename}`

### API-Routes (`/api/upload/`)

| Route | Methode | Funktion |
|-------|---------|----------|
| `/api/upload` | POST | File-Upload (FormData) |
| `/api/upload/[key]` | GET | Signed Download URL |
| `/api/upload/[key]` | DELETE | Datei loeschen |

User-Scope: Jeder User kann nur eigene Dateien unter `uploads/{userId}/` lesen und loeschen.

---

## MCP (Model Context Protocol)

Die App ist MCP Client: Sie verbindet sich zu externen MCP-Servern (HTTP/SSE), entdeckt deren Tools, und reicht sie an `streamText()` weiter. MCP-Tools erscheinen neben den bestehenden (web_search, web_fetch, code_execution) im Assistant.

### Aktivierung

1. `MCP_ENABLED=true` in `.env.local` setzen
2. Server in `src/config/mcp.ts` konfigurieren (Array `MCP_SERVERS`)
3. Env-Var des jeweiligen Servers setzen (opt-in Gate)

### Architektur

- **Config:** `src/config/mcp.ts` — Server-Registry mit `MCPServerConfig` Interface
- **Client:** `src/lib/mcp/index.ts` — `connectMCPServers()` verbindet parallel, merged Tools
- **Integration:** `src/app/api/assistant/chat/route.ts` — MCP-Tools werden im Normal-Modus gemerged (nicht bei Skill-Requests)
- **Feature-Flag:** `features.mcp.enabled` (opt-in via `MCP_ENABLED`)

### Neuen MCP-Server hinzufuegen

1. Eintrag in `MCP_SERVERS` Array in `src/config/mcp.ts`:
   ```typescript
   {
     id: "myserver",           // Wird Tool-Prefix: myserver__toolname
     name: "My MCP Server",
     url: "${MY_SERVER_URL}",  // Env-Var Interpolation
     envVar: "MY_SERVER_URL",  // Opt-in Gate
     headers: { Authorization: "Bearer ${MY_SERVER_TOKEN}" },
     experts: ["general"],     // Optional: nur fuer bestimmte Experten
   }
   ```
2. Env-Vars in `.env.local` setzen
3. Kein weiterer Code noetig — Tools werden automatisch entdeckt und in der bestehenden Tool-UI gerendert

### Sicherheit

- **Allowlist:** Nur Server aus `src/config/mcp.ts`, keine User-definierten URLs
- **Secrets:** Headers nutzen `${VAR}` Syntax, nie hardcoded
- **Tool-Prefixing:** `{serverId}__{toolName}` verhindert Namenskollisionen mit Built-in Tools
- **Timeout:** 5s pro Server, langsame Server werden uebersprungen (graceful degradation)
- **Server-seitig:** MCP-Connections laufen in der API-Route, kein CSP-Impact

---

## Wiederverwendung (Skeleton-Workflow)

Wenn eine neue App erstellt wird:

1. Repository klonen
2. `src/config/navigation.ts` — Navigation austauschen
3. `src/config/apps.ts` — Aktive App markieren
4. `src/app/(app)/` — Route-Segmente für neue Module erstellen
5. `.env.local` — Neue Logto App-ID, Neon DB eintragen. Optional: `FIRECRAWL_API_KEY` (Web Services), R2 Credentials (Storage).
6. `package.json` — Name anpassen
7. Vercel — Neues Projekt, Subdomain zuweisen

Die gesamte Shell (Sidebar, Header, Auth, DB-Setup) bleibt identisch.

---

## Next.js 16 Besonderheiten

Dieses Projekt nutzt Next.js 16. Folgende Punkte sind zu beachten:

- **Turbopack ist Default** — kein `--turbopack` Flag nötig bei `next dev` und `next build`
- **`proxy.ts` statt `middleware.ts`** — Export `proxy()`, Node.js Runtime (kein Edge)
- **Async Request APIs** — `cookies()`, `headers()`, `params`, `searchParams` sind **nur noch async** (kein synchroner Zugriff mehr!)
- **`next lint` entfernt** — ESLint direkt über CLI aufrufen
- **ESLint Flat Config** — `eslint.config.js` statt `.eslintrc`
- **React 19.2** — View Transitions, `useEffectEvent`, Activity verfügbar
- **React Compiler** — Optional aktivierbar via `reactCompiler: true` in `next.config.ts`
- **Keine `next/legacy/image`** — Nur `next/image` verwenden

---

## Commands

```bash
pnpm dev             # Entwicklungsserver starten (Turbopack Default)
pnpm build           # Production Build (Turbopack Default)
pnpm lint            # ESLint (kein `next lint` in v16)
pnpm db:generate     # Drizzle Migrations generieren
pnpm db:push         # Schema direkt an DB pushen (Dev)
pnpm db:studio       # Drizzle Studio (DB Browser)
```

---

## Feature Flags

Feature Flags werden über Environment Variables in `src/config/features.ts` gesteuert:

```typescript
export const features = {
  chat: {      enabled: process.env.NEXT_PUBLIC_CHAT_ENABLED !== "false" },  // Opt-out
  assistant: { enabled: process.env.NEXT_PUBLIC_CHAT_ENABLED !== "false" },  // Opt-out (gleich wie chat)
  mermaid: {   enabled: process.env.NEXT_PUBLIC_MERMAID_ENABLED !== "false" }, // Opt-out
  web: {       enabled: !!process.env.FIRECRAWL_API_KEY },                    // Opt-in
  storage: {   enabled: !!process.env.R2_ACCESS_KEY_ID },                     // Opt-in
  mcp: {       enabled: !!process.env.MCP_ENABLED },                          // Opt-in
} as const
```

Zwei Patterns:
- **Opt-out** (chat, assistant, mermaid): Default `enabled`, explizit `"false"` deaktiviert.
- **Opt-in** (web, storage): Nur aktiv wenn der zugehoerige API-Key gesetzt ist. Ohne Key sind die Routes nicht erreichbar (404).

---

## Security

### Headers

`next.config.ts` setzt automatisch Security Headers für alle Routes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Content Security Policy

CSP wird in `next.config.ts` konfiguriert. Bei Aenderungen an der CSP beachten:

- **`connect-src` braucht `blob:`** — File-Uploads im Assistant konvertieren Dateien client-seitig von blob-URLs zu data-URLs via `fetch(blobUrl)`. Ohne `blob:` in `connect-src` schlaegt der fetch fehl und rohe blob-URLs landen am Server, was zu `"Invalid base64 data"` Fehlern fuehrt.
- **`img-src` braucht `blob:` und `data:`** — Attachment-Previews nutzen blob-URLs, Inline-Bilder nutzen data-URLs.

### Chat-API Input-Validierung

- **Slug-Validierung:** `moduleSlug` wird gegen `/^[a-z0-9-]+$/` geprüft (Path Traversal Prevention)
- **Message-Limit:** Max. 50 Messages pro Request (server-seitig)
- **Nachrichtenlänge:** Max. 2000 Zeichen pro User-Nachricht
- **JSON-Parsing:** try/catch um `req.json()`, gibt 400 bei invalidem Body

---

## Environment

Alle benötigten Environment Variables stehen in `.env.example`. Für lokale Entwicklung `.env.local` anlegen.

Wichtig:

- `LOGTO_COOKIE_SECRET` muss mindestens 32 Zeichen lang sein
- `LOGTO_BASE_URL` ist `http://localhost:3000` in Dev und die Produktions-URL in Production
- `DATABASE_URL` kommt aus dem Neon Dashboard (Connection String mit `?sslmode=require`)
