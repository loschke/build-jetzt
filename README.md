# sevenx-app-boilerplate

Wiederverwendbare App-Shell unter der sevenX Dachmarke. Wird fuer jede neue App geklont und mit eigener Navigation und Inhalten befuellt.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** (Strict Mode)
- **Tailwind CSS v4** + **shadcn/ui** (Light Mode only)
- **loschke-auth** (`arctic` + `jose`) — OIDC + PKCE gegen `auth.loschke.ai`
- **Neon** (Serverless Postgres) + **Drizzle ORM**
- **Vercel AI SDK** — Chat/Streaming Features
- **Vercel** — Deployment

## Quickstart

```bash
# 1. Repository klonen
git clone <repo-url> meine-neue-app
cd meine-neue-app

# 2. Dependencies installieren
pnpm install

# 3. Environment konfigurieren
cp .env.example .env.local
# Werte in .env.local eintragen (OIDC, Neon, etc.)

# 4. Dev-Server starten
pnpm dev
```

## Neue App erstellen

1. Repository klonen
2. `src/config/navigation.ts` — Navigation austauschen
3. `src/config/apps.ts` — Aktive App markieren
4. `src/app/(app)/` — Route-Segmente fuer neue Module erstellen
5. `.env.local` — Neue OIDC Client-ID, Neon DB, etc. eintragen
6. `package.json` — Name anpassen
7. Vercel — Neues Projekt, Subdomain zuweisen

Die gesamte Shell (Sidebar, Header, Auth, DB-Setup) bleibt identisch.

## Projekt-Struktur

```
src/
  app/              # Routing und Layouts (minimale Logik)
    (app)/           # Protected Routes (Auth required)
    api/auth/        # Auth-Endpoints (sign-in, callback, sign-out)
    api/chat/        # Chat-API Route
  components/
    ui/              # shadcn/ui (generiert, nicht manuell aendern)
    layout/          # App-Shell (Sidebar, Header, etc.)
    chat/            # Chat-Panel Komponenten
  config/            # Navigation, Apps, Features, Chat
                     # (diese Dateien werden pro App ausgetauscht)
  lib/               # Auth, DB, Utilities
  types/             # Geteilte TypeScript-Definitionen
  content/           # Statische Inhalte (Chat-Guides, Fragen)
```

## Commands

```bash
pnpm dev             # Entwicklungsserver (Turbopack)
pnpm build           # Production Build
pnpm db:generate     # Drizzle Migrations generieren
pnpm db:push         # Schema direkt an DB pushen (Dev)
pnpm db:studio       # Drizzle Studio (DB Browser)
```

## Architektur-Details

Siehe [CLAUDE.md](./CLAUDE.md) fuer ausfuehrliche Dokumentation zu Coding-Konventionen, Auth-Flow, Datenbank-Design und Next.js 16 Besonderheiten.
