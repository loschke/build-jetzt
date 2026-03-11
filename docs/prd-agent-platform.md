# PRD: Zentrale Agent-Plattform fuer lernen.diy

> Product Requirements Document -- Grundlage fuer die Implementierung einer zentralen Agent-Plattform, die Knowledge, Experten und Presets als unabhaengige, komponierbare Bausteine verwaltet.

**Status:** Konzept / Pre-Implementation
**Erstellt:** 2026-02-28
**Kontext:** sevenx-app-boilerplate (Skeleton fuer alle lernen.diy Apps)

---

## 1. Problemstellung

### Was heute existiert

Jede lernen.diy App (z.B. `ai-design.lernen.diy`) verwaltet ihre Experten als Dateien im Repository:

```
src/content/assistants/
├── general/
│   ├── config.json       # Name, Emoji, Beschreibung, Suggestions
│   └── system.md         # Vollstaendiger Systemprompt
├── sparring/
│   ├── config.json
│   └── system.md
└── learning/
    ├── config.json
    └── system.md
```

Die Code-Infrastruktur (`list-experts.ts`, `load-prompt.ts`) liest das Dateisystem, laedt den Systemprompt und optional `knowledge/*.md` Dateien, und uebergibt alles an die Chat-API.

### Warum das nicht skaliert

**Duplizierung ueber Apps hinweg.** Manche Experten (z.B. der General-Assistent) sollen in jeder App verfuegbar sein. Bei 3-5 geplanten Apps heisst das: gleiche Dateien in 3-5 Repos pflegen. Aenderung am Systemprompt = manuelles Update in jedem Repo.

**Knowledge ist an Experten gekoppelt.** Ein Knowledge-Pool "Design Thinking" gehoert aktuell einem einzigen Experten. Derselbe Wissensbestand kann nicht von einem Lernbegleiter UND einem Sparringspartner genutzt werden, ohne die Dateien zu duplizieren.

**Kein Admin-Interface.** Systemprompts und Knowledge-Dateien werden per Code-Editor bearbeitet und per Git deployed. Fuer einen Solo-Entwickler akzeptabel, aber nicht wenn spaeter jemand anderes Inhalte pflegen soll.

**Drei Dimensionen in einer Datei verschmolzen.** Der aktuelle Systemprompt vermischt Persoenlichkeit (WER antwortet), Fachwissen (WORUEBER) und Faehigkeiten (WAS produziert wird). Diese drei Dinge aendern sich unabhaengig voneinander und sollten getrennt verwaltbar sein.

---

## 2. Vision

Eine Agent-Plattform mit **drei unabhaengigen Dimensionen**, die frei kombiniert werden koennen:

```
┌─────────────────────────────────────────────────────────┐
│                    Agent-Plattform                       │
│                                                         │
│   Dimension 1          Dimension 2         Dimension 3  │
│   KNOWLEDGE            EXPERTS             PRESETS      │
│   (Worueber)           (Wer + Wie)         (Empfehlung) │
│                                                         │
│   ┌──────────┐        ┌──────────┐       ┌──────────┐  │
│   │ Design   │        │ Lern-    │       │ "Design  │  │
│   │ Thinking │◄──────►│ begleiter│◄─────►│ Thinking │  │
│   └──────────┘        └──────────┘       │  lernen" │  │
│   ┌──────────┐        ┌──────────┐       └──────────┘  │
│   │ Prompt   │        │ Sparring │       ┌──────────┐  │
│   │ Enginee- │◄──────►│ partner  │◄─────►│ "Design  │  │
│   │ ring     │        └──────────┘       │ Thinking │  │
│   └──────────┘        ┌──────────┐       │ vertie-  │  │
│   ┌──────────┐        │ Content  │       │  fen"    │  │
│   │ Marken-  │        │ Experte  │       └──────────┘  │
│   │ fuehrung │        └──────────┘                     │
│   └──────────┘                                         │
│                                                         │
│   n:m Beziehung       Skills pro         Expert +       │
│   Wiederverwendbar    Experte            Pool(s)        │
└─────────────────────────────────────────────────────────┘
```

Jede Dimension ist eigenstaendig. Ein Knowledge Pool existiert unabhaengig davon, ob ein Experte ihn nutzt. Ein Experte funktioniert ohne Knowledge Pool. Ein Preset ist eine Empfehlung, keine Pflicht.

---

## 3. Kernkonzepte

### 3.1 Knowledge Pools

Ein Knowledge Pool ist eine thematische Wissenssammlung. Er gehoert keinem Experten, sondern steht als eigenstaendige Ressource zur Verfuegung.

**Eigenschaften:**

- Eindeutiger Slug, Name, Beschreibung
- Enthaelt mehrere Knowledge Entries (sortierbar)
- Scope: `app_slug = NULL` (global, in allen Apps) oder `app_slug = "ai-design"` (nur in einer App)
- Wiederverwendbar: Derselbe Pool kann von mehreren Experten, Presets oder sogar Nicht-Chat-Features (Content-Generierung, Analyse-Tools) genutzt werden

**Beispiele:**

- "Design Thinking" -- Double Diamond, Design Sprints, User Research
- "Prompt Engineering" -- Techniken, Patterns, Best Practices
- "Markenfuehrung" -- Brand Voice, Visual Identity, Positionierung

**Ein Knowledge Entry** ist ein einzelner Wissensblock innerhalb eines Pools. Inhalt als Markdown-Text direkt in der Datenbank gespeichert (kein Dateiverweis). Gleiche Groessenordnung wie heute die `knowledge/*.md` Dateien -- wenige KB bis niedrige MB, kein Problem fuer Postgres.

### 3.2 Experts (mit Skills)

Ein Expert definiert **Persoenlichkeit und Verhalten** -- WER antwortet und WIE.

**Eigenschaften:**

- Systemprompt (Markdown-Text, definiert Ton, Stil, Verhaltensregeln)
- Optional: Default-Pools (Knowledge, das immer mitgeladen wird)
- Skills: Strukturierte Output-Faehigkeiten
- Scope: Global oder app-spezifisch (wie Knowledge Pools)

**Abgrenzung zum Status Quo:** Heute steckt im Systemprompt alles -- Persoenlichkeit, Fachwissen, implizite Faehigkeiten. Kuenftig enthaelt der Systemprompt NUR die Persoenlichkeit. Fachwissen kommt aus Knowledge Pools, Faehigkeiten aus Skills.

#### Skills

Ein Skill ist eine benannte, strukturierte Faehigkeit eines Experten. Technisch ein AI Tool (JSON Schema), das der Experte aufrufen kann, um strukturierten Output zu produzieren.

**Beispiele:**

| Expert           | Skill                  | Output-Typ              |
| ---------------- | ---------------------- | ----------------------- |
| Lernbegleiter    | `create_flashcards`    | Lernkarten-Set          |
| Lernbegleiter    | `create_quiz`          | Quiz mit Fragen         |
| Lernbegleiter    | `explain_step_by_step` | Schrittweise Erklaerung |
| Content-Experte  | `linkedin_carousel`    | Carousel-Slides         |
| Content-Experte  | `blog_post`            | Blog-Entwurf            |
| Sparringspartner | `swot_analysis`        | SWOT-Matrix             |
| Sparringspartner | `devils_advocate`      | Gegenargumente          |

**Aufbau eines Skills:**

- `slug` -- Identifier (z.B. `create_flashcards`)
- `name` -- Anzeigename (z.B. "Lernkarten erstellen")
- `tool_schema` -- JSON Schema fuer die AI Tool Definition
- `output_type` -- Bestimmt den Frontend-Renderer (z.B. `"flashcards"` -> `renderers/flashcards.tsx`)
- `enabled` -- Kann pro Preset aktiviert/deaktiviert werden

**Wichtig:** Die Tool-Definition (Schema) lebt in der Datenbank. Der Renderer (React-Komponente) lebt im App-Code. Die Verbindung laeuft ueber den `output_type` String.

### 3.3 Presets

Ein Preset ist eine empfohlene Kombination aus Expert + Knowledge Pool(s) + optional aktiven Skills. Presets sind Einstiegspunkte fuer User -- sie beantworten die Frage "Womit soll ich anfangen?".

**Beispiele:**

| Preset                      | Expert           | Knowledge Pool(s)                | Zielgruppe       |
| --------------------------- | ---------------- | -------------------------------- | ---------------- |
| "Design Thinking lernen"    | Lernbegleiter    | Design Thinking                  | Einsteiger       |
| "Design Thinking vertiefen" | Sparringspartner | Design Thinking                  | Fortgeschrittene |
| "Content fuer Design"       | Content-Experte  | Design Thinking + Markenfuehrung | Practitioner     |

Presets sind Empfehlungen, keine Einschraenkungen. User koennen auch frei kombinieren: jeden Experten mit jedem Knowledge Pool.

### 3.4 Prompt-Assembly zur Laufzeit

Wenn ein User chattet, wird der Systemprompt dynamisch zusammengebaut:

```
Gewaehlter Expert:         Sparringspartner
Gewaehlter Knowledge Pool: Design Thinking
Expert Default Pool:       (keiner)

Assemblierter Systemprompt:
┌──────────────────────────────────────────────────┐
│ [Expert: system_prompt]                          │
│ "Du bist ein kritischer Denkpartner der..."      │
│                                                  │
│ ---                                              │
│                                                  │
│ ## Kontext-Wissen                                │
│                                                  │
│ ### Double Diamond                               │
│ "Der Double Diamond Prozess besteht aus..."      │
│                                                  │
│ ### Design Sprint Methode                        │
│ "Ein Design Sprint ist ein 5-Tage-Prozess..."    │
│                                                  │
│ ### User Research Grundlagen                     │
│ "User Research beginnt mit..."                   │
└──────────────────────────────────────────────────┘
```

Der Separator (`---\n\n## Kontext-Wissen\n\n`) und das Entry-Format (`### {label}\n\n{content}`) entsprechen dem heutigen Pattern in `load-prompt.ts`.

**Mit Default-Pools:**

```
Expert "Design-Coach" hat Default-Pool [Design Thinking]
User waehlt zusaetzlich [Markenfuehrung]

=> Prompt = Coach-Persoenlichkeit + Design Thinking (Default) + Markenfuehrung (User-Wahl)
```

---

## 4. Datenmodell

### Phase 1: Einfache Zentralisierung (1:n)

Knowledge gehoert noch einem Experten. Hauptziel: Raus aus dem Dateisystem, rein in die Datenbank. Globale vs. app-spezifische Experten ueber `app_slug`.

```sql
-- Experten mit Systemprompt direkt in der DB
CREATE TABLE experts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🤖',
  description   TEXT NOT NULL,
  system_prompt TEXT NOT NULL,           -- Vollstaendiger Markdown-Text
  suggestions   JSONB NOT NULL DEFAULT '[]',  -- string[]
  app_slug      TEXT,                    -- NULL = global, "ai-design" = app-spezifisch
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge-Eintraege pro Experte (1:n)
CREATE TABLE expert_knowledge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id     UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  content       TEXT NOT NULL,           -- Vollstaendiger Markdown-Text
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Phase 2: Vollstaendiges Modell (n:m, Skills, Presets)

Knowledge wird von Experten entkoppelt. Skills und Presets kommen dazu.

```sql
-- Eigenstaendige Knowledge Pools
CREATE TABLE knowledge_pools (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  app_slug      TEXT,                    -- NULL = global
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, app_slug)
);

-- Inhalte innerhalb eines Pools
CREATE TABLE knowledge_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id       UUID NOT NULL REFERENCES knowledge_pools(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  content       TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Experten (nur noch Persoenlichkeit, kein eigenes Knowledge)
CREATE TABLE experts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  emoji         TEXT NOT NULL DEFAULT '🤖',
  description   TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  suggestions   JSONB NOT NULL DEFAULT '[]',
  app_slug      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, app_slug)
);

-- Default-Pools pro Experte (werden immer mitgeladen)
CREATE TABLE expert_default_pools (
  expert_id     UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  pool_id       UUID NOT NULL REFERENCES knowledge_pools(id) ON DELETE CASCADE,
  PRIMARY KEY (expert_id, pool_id)
);

-- Skills pro Experte
CREATE TABLE expert_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id     UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  tool_schema   JSONB NOT NULL,          -- JSON Schema fuer AI Tool
  output_type   TEXT NOT NULL,           -- Renderer-Key im Frontend
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (expert_id, slug)
);

-- Presets: Empfohlene Kombinationen
CREATE TABLE presets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  expert_id     UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  app_slug      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug, app_slug)
);

-- Welche Pools ein Preset beinhaltet
CREATE TABLE preset_pools (
  preset_id     UUID NOT NULL REFERENCES presets(id) ON DELETE CASCADE,
  pool_id       UUID NOT NULL REFERENCES knowledge_pools(id) ON DELETE CASCADE,
  PRIMARY KEY (preset_id, pool_id)
);
```

**Design-Entscheidung:** Content wird direkt als Text in der DB gespeichert, nicht als URL auf externe Dateien. Postgres handhabt Textspalten in dieser Groessenordnung (KB bis niedrige MB) problemlos. Gleiches Pattern wie OpenAI Custom GPTs und Claude Projects.

---

## 5. Architektur-Optionen

Zwei Wege, wie die Boilerplate-Apps die zentrale Plattform konsumieren koennen.

### Option A: Shared Neon DB (Direktzugriff)

Jede App bekommt eine zweite `EXPERTS_DATABASE_URL` Umgebungsvariable und liest direkt aus der gemeinsamen Experten-DB.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ai-design    │     │ prompt-eng   │     │ strategie    │
│ App          │     │ App          │     │ App          │
│              │     │              │     │              │
│ experts-     │     │ experts-     │     │ experts-     │
│ schema.ts    │     │ schema.ts    │     │ schema.ts    │
│ (Kopie)      │     │ (Kopie)      │     │ (Kopie)      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼───────┐
                    │ Shared Neon   │
                    │ Experts DB    │
                    └───────────────┘
```

**Pro:**

- Kein neuer Service, kein neues Deployment, keine neue Domain
- Weniger moving parts. Eine DB-Connection, fertig.
- Bekannter Stack (Neon + Drizzle, wie in jeder App)
- Fallback auf lokale Dateien ist trivial
- Schnellere Queries (kein HTTP-Overhead)

**Contra:**

- **Schema-Duplizierung:** Jede App braucht `experts-schema.ts` als lokale Kopie. Schema-Aenderungen erfordern Updates in jeder App. Das verschiebt das Problem von "Content-Dateien in 5 Repos" zu "Schema-Dateien in 5 Repos".
- **Keine zentrale Business-Logik:** Validierung, Transformation, Caching muss in jeder App dupliziert werden
- **Voller DB-Zugriff:** Jede App hat Lese- UND potentiell Schreibzugriff. Kein Schutz gegen versehentliche Writes.

### Option B: Dedizierter API Service

Ein kleiner Service (Next.js, Hono oder Cloudflare Worker) unter z.B. `api.lernen.diy/experts` mit 2-3 REST-Endpoints. Apps rufen via `fetch()` ab.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ ai-design    │     │ prompt-eng   │     │ strategie    │
│ App          │     │ App          │     │ App          │
│              │     │              │     │              │
│ fetch()      │     │ fetch()      │     │ fetch()      │
│ nur JSON     │     │ nur JSON     │     │ nur JSON     │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┼────────────────────┘
                            │
                    ┌───────▼───────┐
                    │ Agent API     │
                    │ Service       │
                    │ (api.lernen.  │
                    │  diy/experts) │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Neon DB       │
                    └───────────────┘
```

**Pro:**

- **Schema lebt an genau einer Stelle.** Apps kennen nur den JSON-Contract (`ExpertConfig`), nicht die DB-Struktur. Schema-Aenderung = ein Deployment, null App-Updates.
- **Zentrale Logik:** Validierung, Caching-Headers, Rate Limiting, Transformationen an einer Stelle
- **Admin-UI waechst natuerlich:** Einfach eine weitere Route im selben Service
- **Saubere Lese-Trennung:** Apps haben keinen DB-Zugriff, nur GET-Endpoints
- **Flexible Consumer:** Nicht nur Next.js Apps -- der Astro Hub, ein CLI Tool oder eine Mobile App koennten dieselbe API nutzen
- **Storage austauschbar:** Wechsel von Neon zu Turso, D1 oder sogar JSON-Datei, ohne dass eine App es merkt

**Contra:**

- **Noch ein Deployment:** Noch ein Vercel-Projekt, noch eine Domain, noch ein Service der laufen muss
- **Zusaetzlicher Netzwerk-Hop:** App -> API -> DB statt App -> DB. In der Praxis ~50ms mehr auf Vercel-to-Vercel. Mit Caching irrelevant.
- **Auth zwischen Services:** Braucht einen API-Key oder Shared Secret. Nicht komplex, aber muss korrekt sein.
- **Cold Starts:** ~500ms auf Vercel wenn der Service laenger nicht aufgerufen wurde. Mit `Cache-Control` + `stale-while-revalidate` Headers fast unsichtbar.

### Bewertung

Das Schema-Duplizierungsproblem ist der Kern. Shared DB loest "Ich muss Content-Dateien in 5 Repos aktualisieren", erzeugt aber "Ich muss Schema-Dateien in 5 Repos aktualisieren". In der Praxis aendern sich Schemas seltener als Content -- aber wenn, ist es genauso nervig. Der API Service eliminiert das komplett.

So einfach wird `listExperts()` in jeder App:

```typescript
const res = await fetch(`${EXPERTS_API_URL}/experts?app=${APP_SLUG}`)
const experts: ExpertConfig[] = await res.json()
```

Kein Drizzle-Schema, kein DB-Client, kein zweiter Connection String. Nur ein `fetch()`.

**Empfehlung:** API Service. ~2-3 Stunden mehr Setup als Shared DB, aber die sauberere Grundlage fuer die kommenden Monate mit 3-5 Apps.

---

## 6. Integration: Wie Apps die Plattform konsumieren

### Heutiger Code (Dateisystem)

```typescript
// src/lib/assistant/list-experts.ts
const entries = await fs.readdir(ASSISTANTS_DIR, { withFileTypes: true })
// -> Liest config.json aus jedem Unterordner

// src/lib/assistant/load-prompt.ts
const systemContent = await fs.readFile(
  path.join(basePath, "system.md"), "utf-8"
)
// -> Liest system.md + knowledge/*.md, konkateniert mit Separator
```

### Kuenftiger Code (API Service)

```typescript
// src/lib/assistant/list-experts.ts
export async function listExperts(): Promise<ExpertConfig[]> {
  const res = await fetch(
    `${process.env.EXPERTS_API_URL}/experts?app=${process.env.APP_SLUG}`,
    { next: { revalidate: 300 } }  // 5 Min Cache
  )
  return res.json()
}

// src/lib/assistant/load-prompt.ts
export async function loadAssistantPrompt(
  slug: string,
  poolSlug?: string
): Promise<string> {
  const params = new URLSearchParams({ app: process.env.APP_SLUG! })
  if (poolSlug) params.set("pool", poolSlug)

  const res = await fetch(
    `${process.env.EXPERTS_API_URL}/experts/${slug}/prompt?${params}`,
    { next: { revalidate: 300 } }
  )
  const { systemPrompt } = await res.json()
  return systemPrompt
}
```

### Fallback-Strategie

Wenn `EXPERTS_API_URL` nicht gesetzt ist, faellt die App auf die heutige dateibasierte Logik zurueck. Das erhaelt die Standalone-Faehigkeit fuer Entwicklung und fuer Apps, die die Plattform nicht nutzen wollen.

```typescript
export async function listExperts(): Promise<ExpertConfig[]> {
  if (process.env.EXPERTS_API_URL) {
    return listExpertsFromAPI()
  }
  return listExpertsFromFilesystem()  // Heutiger Code
}
```

### API-Endpoints des Agent Service

| Endpoint                                            | Methode | Beschreibung                                          |
| --------------------------------------------------- | ------- | ----------------------------------------------------- |
| `/experts?app={slug}`                               | GET     | Alle Experten fuer eine App (global + app-spezifisch) |
| `/experts/{slug}/prompt?app={slug}&pool={poolSlug}` | GET     | Assemblierter Systemprompt                            |
| `/knowledge-pools?app={slug}`                       | GET     | Alle verfuegbaren Knowledge Pools                     |
| `/presets?app={slug}`                               | GET     | Alle Presets fuer eine App                            |
| `/experts/{slug}/skills`                            | GET     | Skills eines Experten                                 |

### Aenderungen in der Boilerplate

| Datei                                 | Aenderung                                                  |
| ------------------------------------- | ---------------------------------------------------------- |
| `src/lib/assistant/list-experts.ts`   | `fetch()` statt `fs.readdir()`                             |
| `src/lib/assistant/load-prompt.ts`    | `fetch()` statt `fs.readFile()`                            |
| `src/lib/assistant/types.ts`          | Erweitern um `KnowledgePool`, `Preset`, `Skill` Interfaces |
| `src/app/api/assistant/chat/route.ts` | Pool-Slug aus Request entgegennehmen                       |
| `src/config/assistants.ts`            | Neue Env-Var `EXPERTS_API_URL`                             |
| `.env.example`                        | `EXPERTS_API_URL` und `APP_SLUG` dokumentieren             |

Die restliche App (Chat-UI, Artifact-Panel, Header, Sidebar) bleibt unveraendert.

---

## 7. Offene Fragen

### Architektur

1. **API Service vs. Shared DB** -- Finale Entscheidung treffen. Dieses PRD empfiehlt API Service, aber der pragmatischere Weg (Shared DB) ist fuer einen Solo-Entwickler ebenfalls vertretbar.

2. **Phase 1 oder direkt Phase 2?** -- Starten mit einfacher 1:n Zentralisierung (Knowledge gehoert einem Experten) oder direkt das volle n:m Modell mit entkoppelten Knowledge Pools bauen?

### Skills

3. **Renderer-Synchronisierung** -- Tool-Definitionen (JSON Schema) leben in der DB, aber Renderer-Komponenten (`renderers/flashcards.tsx`) leben im App-Code. Wie bleibt das synchron? Optionen: Convention-over-Configuration (fester `output_type` -> Komponenten-Mapping), oder ein Renderer-Registry im App-Code.

4. **Skill-Aktivierung zur Laufzeit** -- Wie waehlt der User aktive Skills? Automatisch per Preset? Manuell per Toggle? Immer alle aktiviert?

### UX

5. **Runtime-Kombinations-UI** -- Wie waehlt der User Expert + Knowledge Pool im Chat-Interface? Preset-basierte Einstiegspunkte sind klar, aber freie Kombination braucht UX-Design. Denkbar: Dropdown oder Selector im Chat-Header.

6. **Admin-UI** -- Wie sieht das Management-Interface aus? Diskutiert wurde: Expert-Liste links, Editor mit Tabs rechts (ein Tab fuer Systemprompt, ein Tab pro Knowledge Entry, Button fuer neue Entries). Eigene App oder Teil des API Service?

### Technisch

7. **Caching-Strategie** -- Wie aggressiv Experten-Daten in den Apps cachen? `Cache-Control` mit `stale-while-revalidate` ist der Plan, aber die konkreten TTLs muessen definiert werden.

8. **Service-to-Service Auth** -- API-Key oder Shared Secret? Rotation? Rate Limiting?

9. **Knowledge Pools ausserhalb von Chat** -- Das Konzept sieht vor, dass Pools auch fuer Content-Generierung, Analyse-Tools oder APIs nutzbar sind. Die konkreten Consumption-Patterns dafuer sind noch offen.

### Migration

10. **Migrationspfad** -- Wie die drei existierenden Experten (general, sparring, learning) aus dem Dateisystem in die zentrale Plattform migrieren, ohne laufende Deployments zu brechen. Der Fallback-Mechanismus (`EXPERTS_API_URL` gesetzt -> API, sonst Dateisystem) deckt das konzeptionell ab, aber der konkrete Ablauf muss geplant werden.

---

## 8. Phasenplan

### Phase 1: Zentralisierung (Foundation)

**Ziel:** Experten aus dem Dateisystem in eine zentrale Datenbank verschieben. Globale vs. app-spezifische Experten ermoeglichen.

**Scope:**

- Zentrale Neon DB aufsetzen (oder Tabellen im bestehenden DB-Schema)
- Einfaches Schema: `experts` + `expert_knowledge` (1:n)
- `app_slug` Feld (NULL = global, "ai-design" = app-spezifisch)
- API Service oder Shared DB implementieren (Architektur-Entscheidung)
- `list-experts.ts` und `load-prompt.ts` umschreiben
- Bestehende 3 Experten migrieren
- Fallback auf Dateisystem wenn keine API-URL konfiguriert

**Ergebnis:** Experten werden zentral verwaltet. Aenderung an einem globalen Experten wirkt sofort in allen Apps.

### Phase 2: Entkoppeltes Knowledge (Context Hubs)

**Ziel:** Knowledge von Experten loesen. Wiederverwendbare Knowledge Pools als eigenstaendige Dimension.

**Scope:**

- `knowledge_pools` + `knowledge_entries` Tabellen
- n:m Beziehung: `expert_default_pools` (optionale feste Zuordnung)
- Knowledge Pools unabhaengig verwaltbar
- Runtime-Auswahl: User waehlt Expert + Pool Kombination
- UI fuer Pool-Auswahl im Chat-Interface

**Ergebnis:** Derselbe Knowledge Pool "Design Thinking" kann vom Lernbegleiter UND vom Sparringspartner genutzt werden. Verschiedene Lernperspektiven auf dasselbe Wissen.

### Phase 3: Skills und Presets (Agent Platform)

**Ziel:** Strukturierte Output-Faehigkeiten und kuratierte Einstiegspunkte.

**Scope:**

- `expert_skills` Tabelle mit `tool_schema` (JSON Schema) und `output_type`
- Frontend-Renderer-Mapping in der App (`output_type` -> React-Komponente)
- `presets` + `preset_pools` Tabellen
- Preset-basierte Navigation im Chat-Interface
- Skill-Aktivierung per Preset oder manuell

**Ergebnis:** Experten koennen strukturierte Outputs produzieren (Lernkarten, Quizze, SWOT-Analysen). Presets bieten kuratierten Einstieg fuer verschiedene Lernziele und Erfahrungsstufen.

### Phase 4: Admin-UI (Optional)

**Ziel:** Grafisches Interface fuer die Verwaltung aller Plattform-Inhalte.

**Scope:**

- Web-UI fuer CRUD-Operationen auf Experts, Knowledge Pools, Skills, Presets
- Markdown-Editor fuer Systemprompts und Knowledge Entries
- Preview: "So wuerde der assemblierte Prompt aussehen"
- Nutzbar ohne technisches Wissen

**Ergebnis:** Inhalte koennen ohne Code-Editor und Git gepflegt werden.

---

## Appendix: Bestehende Infrastruktur

### lernen.diy Plattform

| Service         | Domain                   | Stack                        |
| --------------- | ------------------------ | ---------------------------- |
| Hub/Landing     | `lernen.diy`             | Astro (separates Repo)       |
| Erste Lern-App  | `ai-design.lernen.diy`   | Next.js 16 (dieses Skeleton) |
| Auth            | `auth.lernen.diy`        | Logto OIDC                   |
| Assets          | `assets.lernen.diy`      | Cloudflare R2                |
| Agent API (neu) | `api.lernen.diy/experts` | TBD (Next.js/Hono/Worker)    |

### Aktuelles ExpertConfig Interface

```typescript
// src/lib/assistant/types.ts
export interface ExpertConfig {
  slug: string
  name: string
  emoji: string
  description: string
  suggestions: string[]
}
```

Wird in Phase 2/3 erweitert um:

```typescript
export interface KnowledgePool {
  slug: string
  name: string
  description: string
}

export interface ExpertSkill {
  slug: string
  name: string
  outputType: string
  enabled: boolean
}

export interface Preset {
  slug: string
  name: string
  description: string
  expert: ExpertConfig
  pools: KnowledgePool[]
}
```

### Aktueller Prompt-Assembly Flow

```
list-experts.ts                    load-prompt.ts
      │                                 │
      ▼                                 ▼
fs.readdir(assistants/)     fs.readFile(system.md)
      │                          +  fs.readdir(knowledge/)
      ▼                          +  fs.readFile(*.md) each
config.json -> ExpertConfig      │
                                 ▼
                           system_prompt + separator + knowledge_blocks
                                 │
                                 ▼
                           chat/route.ts -> streamText({ system: prompt })
```

### Relevante Dateien im Skeleton

| Datei                                    | Funktion                                 |
| ---------------------------------------- | ---------------------------------------- |
| `src/lib/assistant/types.ts`             | `ExpertConfig` Interface                 |
| `src/lib/assistant/list-experts.ts`      | Expert-Discovery (Dateisystem)           |
| `src/lib/assistant/load-prompt.ts`       | Prompt-Assembly (system.md + knowledge/) |
| `src/config/assistants.ts`               | Model-Config, Defaults, Upload-Config    |
| `src/app/api/assistant/chat/route.ts`    | Chat-API Route                           |
| `src/app/api/assistant/experts/route.ts` | Expert-Liste API                         |
| `src/content/assistants/*/`              | Expert-Dateien (config.json, system.md)  |
