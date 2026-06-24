# PRD: Brand-Kit-Registry & brand-neutrale Factories

> **Status:** Entwurf zur Abstimmung
> **Erstellt:** 2026-06-23
> **Ziel-System:** build-jetzt (Plattform). Pro-Instanz seedbar.
> **Abhaengigkeiten:** Skill-System (DB), Seed-Pipeline + Instanz-Filter, `load_skill`/`load_skill_resource`, `build-tools.ts`, `src/config/brand.ts`

---

## 1. Problem & Idee

### Heute

Die Content-Factories (carousel, presentation, ebook, infographic …) tragen ihre Brand-Vorgaben **dupliziert in sich**: Jede Factory hat eine eigene `_brands.css` (Farben, Logo-HTML, Logo-CSS, Fonts) plus Brand-Prosa im SKILL.md, die auf die Brainsidian `Visual-Identity-Reference.md` verweist.

Konsequenz: Eine neue Brand ergaenzen heisst, **jede Factory einzeln umbauen**. Eine Brand aendern (Farbe, Logo) heisst, N Dateien synchron halten. Das skaliert nicht — weder fuer Ricos Brand-Oekosystem (loschke/unlearn/lernen) noch fuer Kunden-Instanzen mit eigenem Corporate Design.

### Idee

**Separation of Concerns:** Skill = Mechanik ("wie baue ich ein Carousel"), Brand = Identitaet (Farben, Fonts, Logo, Voice). Die Factories werden **brand-neutral**. Brand-Definitionen liegen in einer **eigenen Registry** als Single Source of Truth. Zur Laufzeit nennt der Nutzer die Brand im Prompt, das Modell laedt das Brand-Kit ueber ein Tool und wendet die Tokens an.

Neue Brand = **ein** neuer Registry-Eintrag. Keine Factory wird angefasst.

### Abgrenzung (Namensraum)

Es gibt bereits zwei verwandte, aber andere Dinge — dieses Feature kollidiert nicht:

| Bestehend | Was es ist | Abgrenzung |
|-----------|-----------|------------|
| `extract_branding` (Firecrawl) | Extrahiert ein Brand-*Profil* aus einer fremden Website (Audit) | Dynamisch, einmalig, fuer Analyse. Hier: kuratierte, wiederverwendbare eigene Brand-Kits |
| Design Studio / `search_design_library` | Bild-Prompt-Formeln + Beispielbilder | Bildgenerierung, nicht visuelle Identitaet |

Arbeitsname dieses Features: **Brand-Kit-Registry**.

---

## 2. Zielbild

```
Factory-Skills (brand-neutral)          Brand-Kit-Registry (DB)
  carousel-factory                        loschke  → Tokens + Logo + Voice
  presentation-factory     ──load_brand──▶ unlearn  → …
  ebook-factory              zur Laufzeit  lernen   → …
  infographic-factory                      kunde-x  → …  (nur in Kunde-X-Instanz)
       │                                       ▲
       └── "Carousel fuer unlearn" im Prompt ──┘
```

**Laufzeit-Flow:** Prompt nennt Brand → Modell ruft `load_brand("unlearn")` → bekommt paste-ready `:root`-Variablen + Logo-Markup + Voice-Regeln → wendet sie im HTML an. Nennt der Nutzer keine Brand, greift die **Default-Brand der Instanz**.

---

## 3. Warum DB-Tabelle statt "Brand-Pack-Skill"

`load_skill_resource(skill, filenames)` funktioniert heute schon skill-uebergreifend. Man koennte also **ohne neue Tabelle/Tool** einen Skill `brand-pack` anlegen, dessen Resources `loschke.md`, `unlearn.md` etc. sind, und die Factories per `load_skill_resource("brand-pack", [...])` darauf zugreifen lassen.

**Verworfen — Grund: Kunden-Instanz-Isolation.** Der Seed-Instanz-Filter wirkt **pro Datei**. Ein Brand-Pack-Skill buendelt alle Brands unter *einer* Skill-Quelle → alle Brands seeden gemeinsam oder gar nicht (all-or-nothing). Damit kann eine Kunden-Instanz nicht "nur die eigene Brand" bekommen, ohne Ricos Brands mitzuschleppen.

Eine **Tabelle mit einem Seed-File pro Brand** (`seeds/brands/{brand}.md`) macht jede Brand einzeln per `instances:`/`excludeInstances:` whitelistbar. Das ist die entscheidende Anforderung. Zusatznutzen: strukturierte Tokens (jsonb), Admin-UI moeglich, sauberer Namensraum statt Brand-als-Skill in der Skill-Liste.

---

## 4. Datenmodell

Neue Tabelle `brands` (`src/lib/db/schema/brands.ts`), bewusst an `skills` angelehnt:

| Spalte | Typ | Zweck |
|--------|-----|-------|
| `id` | text (nanoid) | PK |
| `slug` | text | Lookup-Key (`loschke`, `unlearn`, `kunde-x`) |
| `name` | text | Anzeigename (`loschke.ai`) |
| `description` | text | Kurzbeschreibung |
| `tokens` | jsonb | Strukturierte Design-Tokens, **je Theme (dark/light)** (s. u.) |
| `defaultTheme` | text | `"dark"` \| `"light"` — Default-Modus dieser Brand |
| `logoHtml` | text | Paste-ready Logo-Markup |
| `logoCss` | text | Logo-spezifisches CSS |
| `fonts` | jsonb | Font-Familien + Gewichte/Verwendung |
| `voice` | text (Markdown) | Tonalitaets-Regeln (Kanal-agnostisch) |
| `userId` | text nullable | NULL = global; analog `skills` |
| `isActive` | boolean | |
| `sortOrder` | integer | |
| `createdAt`/`updatedAt` | timestamptz | |

Unique-Index auf `slug WHERE userId IS NULL` (wie `skills`).

**`tokens`-Shape** (direkt aus `_brands.css` der carousel-factory abgeleitet, damit `load_brand` paste-ready ist). **Pro Brand zwei Token-Sets — dark und light** (s. §4a):

```jsonc
{
  "dark": {
    "bgDark":      "#1c242b",
    "bgDarkAlt":   "#26313a",
    "accent":      "#e8472c",
    "textPrimary": "#ffffff",
    "textMuted":   "#a8b4bc",
    "textSoft":    "#e4e9ec"
  },
  "light": {
    "bgDark":      "#ffffff",   // Hauptflaeche (Name historisch — dient auch als Kontrastfarbe auf bg-accent)
    "bgDarkAlt":   "#f1f3f4",
    "accent":      "#dc2e13",
    "textPrimary": "#263238",
    "textMuted":   "#6b7780",
    "textSoft":    "#3c474e"
  }
}
```

> Tokens (harte Werte, maschinell) + Markdown-Voice (weiche Regeln) — beides bewusst kombiniert. Logo getrennt als HTML+CSS, weil es nicht nur Farbe ist (Schriftschnitt, Aufbau, Instrument Serif bei unlearn/lernen).

> Die 6 Token-Namen bleiben in beiden Modi gleich (`bgDark` etc.) — nur die Werte unterscheiden sich. Dadurch referenzieren die Templates weiter dieselben `var(--bg-dark)` und der Modus-Wechsel ist ein reiner Werte-Tausch, kein Markup-Umbau.

> **Optionale Zusatz-Tokens** je Theme: `accentSurface` + `accentOn` (vollflaechiger Akzent-Hintergrund + Textfarbe darauf). Default per CSS-Fallback = `accent` / `bgDark`; nur Brands wie AOK setzen sie (s. §4a).

Instanz-Zuordnung wird **nicht** als Spalte gefuehrt, sondern wie ueberall ueber das Seed-Frontmatter (`instances:` / `excludeInstances:`). Konsistent mit Skills/Experts/Models.

---

## 4a. Theme-Dimension (Dark / Light)

Die Kunden-Brands (queo, queonext, AOK/gesundheitswelt) sind **Light-Mode** (weisser Hintergrund), die bestehenden Factory-Templates **Dark-Mode**. Statt sich auf einen Modus festzulegen, wird **Dark/Light zur waehlbaren Dimension neben der Brand**.

### Mechanik

Die Templates sind bereits stark variablengesteuert (carousel: 365 `var(--…)`-Nutzungen, presentation: 995). Ein Theme-Wechsel ist daher **ein zweites Token-Set + ein Umschalter**, kein Markup-Umbau:

```css
:root, [data-theme="dark"]  { --bg-dark:#1c242b; --text-primary:#fff;     --accent:#e8472c; … }
[data-theme="light"]        { --bg-dark:#fff;     --text-primary:#263238; --accent:#dc2e13; … }
```

Das Modell setzt beim Generieren `<body data-theme="light|dark">`. Theme kommt aus Prompt → sonst `brands.defaultTheme` → sonst Instanz-Default.

**Günstige Eigenschaft des bestehenden Token-Designs:** `--bg-dark` dient doppelt als Hauptflaeche *und* als Kontrastfarbe auf `bg-accent`-Slides (`.bg-accent .headline { color: var(--bg-dark) }`). Dadurch funktioniert die Akzent-Inversion in beiden Modi automatisch — in Light wird `--bg-dark` = weiss → weisser Text auf Akzent.

**Akzent ≠ Vollflaeche (gelernt am AOK-Piloten):** Bei manchen Brands ist die Highlight-Farbe als Vollflaechen-Hintergrund zu grell (AOK-Lime `#91F54A`). Deshalb werden zwei Rollen getrennt:
- `--accent` — kleine Akzente (Border, Akzent-Woerter, Logo-Highlight). AOK: Lime.
- `--accent-surface` — vollflaechiger `bg-accent`-Hintergrund. AOK-Dark: dunkles Gruen `#005E3F`.
- `--accent-on` — Textfarbe auf dieser Flaeche. AOK-Dark: weiss.

Beide sind **optional** und fallen per CSS-Fallback auf das bisherige Verhalten zurueck: `var(--accent-surface, var(--accent))` und `var(--accent-on, var(--bg-dark))`. Nur Brands wie AOK setzen sie explizit; queo/queonext brauchen sie nicht.

### Bounded Cleanup (der einzige echte Aufwand)

Was **nicht** automatisch mitschaltet, sind hartkodierte Literale. Audit-Ergebnis:

| Factory | `var(--…)` | hartkodiert weiss | rgba(255) | sonstige Hex | Cleanup |
|---------|-----------|-------------------|-----------|--------------|---------|
| carousel | 365 | 18 | 0 | 42 | gering |
| presentation | 995 | 38 | 10 | 229 | mittel-hoch |
| lesson | 88 | 10 | 0 | 138 | mittel |

Cleanup = diese Literale durch Token ersetzen (`#fff` → `var(--text-primary)`, weisse Overlays → `var(--surface)`/`--text-on-accent`). Pro Factory ein begrenzter Pass, **kein** Rewrite. carousel ist am saubersten → Pilot.

### Auswirkung aufs Datenmodell

`tokens` jsonb haelt `{ dark: {...}, light: {...} }` (s. §4). `load_brand` bekommt einen optionalen `theme`-Parameter und liefert das passende Set.

---

## 5. Seed-Pipeline

- Quelle: `seeds/brands/*.md` — Frontmatter (`slug`, `name`, `tokens`, `fonts`, `logoHtml`, `logoCss`) + Markdown-Body (Voice-Regeln).
- Neuer Seeder `src/lib/db/seed/seed-brands.ts` analog `seed-skills.ts`, idempotent via `upsertBrandBySlug`.
- In Seed-Orchestrator-Reihenfolge einreihen (vor oder neben Skills).
- Instanz-Filter automatisch ueber `extractInstanceFilter` / `shouldSeedForInstance` (bereits vorhanden, kein Neubau).

**Beispiel — Kunden-Brand nur in einer Instanz:**

```yaml
# seeds/brands/kunde-x.md
---
slug: kunde-x
name: Kunde X
instances: [kunde-x]          # nur in dieser Instanz geseedet
tokens: { accent: "#0066CC", ... }
---
Voice-Regeln Kunde X …
```

Ricos Brands (`loschke`/`unlearn`/`lernen`) ohne Filter = ueberall, oder per `excludeInstances: [kunde-x]`, wenn sie in Kunden-Instanzen nicht auftauchen sollen.

---

## 6. Runtime: `load_brand`-Tool + Discovery

### Tool `load_brand` (`src/lib/ai/tools/load-brand.ts`)

- Input: `{ slug: string, theme?: "dark" | "light" }`, validiert gegen die Discovery-Liste (kein freier Lookup — analog `load_skill`). Ohne `theme` → `brands.defaultTheme`.
- Output: `{ slug, name, theme, tokens, logoHtml, logoCss, fonts, voice }` — paste-ready (`tokens` ist das aufgeloeste Set des gewaehlten Modus).
- Registrierung in `build-tools.ts`, bedingt: nur wenn Brands in der Instanz vorhanden sind (Feature-Gate ueber Discovery-Count, kein neuer ENV-Key noetig).
- DB-only, kein externer Provider → **EU/Local unbedenklich**.

### Discovery + Cache (`src/lib/ai/brands/discovery.ts`)

- Spiegelt `discoverSkills`: DB-Query mit 60s-TTL-Cache, `clearBrandCache()` nach Admin-Mutations.
- Liefert die verfuegbaren Brand-Slugs, damit:
  - die Tool-Beschreibung von `load_brand` sie aufzaehlen kann (sonst weiss das Modell nicht, was ladbar ist),
  - der System-Prompt optional einen Hinweis bekommt ("Verfuegbare Brands: …").

### Default-Brand

`NEXT_PUBLIC_BRAND` (existiert in `src/config/brand.ts`) wird als Default-Slug-Fallback wiederverwendet. Nennt der Nutzer keine Brand, laedt die Factory die Default-Brand der Instanz → deterministisch.

---

## 7. Factory-Refactor (Konsumenten)

Pro Factory:

1. `_brands.css` und hartkodierte Brand-Prosa **entfernen**.
2. SKILL.md-Anweisung ersetzen durch: *"Ermittle die Brand (Prompt oder Default), rufe `load_brand`, setze die Tokens in `:root` und das Logo-Markup ein."*
3. HTML-Templates referenzieren weiter `var(--accent)` etc. — die Werte kommen jetzt aus `load_brand` statt aus `_brands.css`. **Kein Template-Umbau noetig**, nur die Quelle der `:root`-Werte aendert sich.

> Voraussetzung: Die Factories existieren als build-jetzt-Skills in der DB. Heute liegen sie als Datei-Skills in `loschke-hub/_skills/`. Schritt 0 des Rollouts ist daher der Import (brand-neutral) der relevanten Factory in die Instanz.

---

## 8. Rollout (iterativ, additiv)

| Milestone | Inhalt | Regression-Check |
|-----------|--------|------------------|
| **M1 — Foundation (inert)** | `brands`-Tabelle, Seeder, Discovery/Cache, `load_brand`-Tool. Noch **keine** Factory umgestellt. | Bestehende Skills/Factories laufen unveraendert (Tool wird nur registriert, nicht erzwungen). |
| **M2 — Pilot (carousel + Theme)** | carousel-factory: Dark/Light-Token-Sets + `data-theme`-Toggle, Bounded Cleanup (18 Literale), eine Test-Brand (queo) in dark + light. Side-by-side gegen alte Version. | loschke-Dark-Output unveraendert; queo-dark + queo-light rendern korrekt. |
| **M3 — Rollout** | Restliche Factories umstellen (presentation, ebook, infographic …) inkl. Bounded Cleanup je Factory (presentation am aufwaendigsten). | Pro Factory Output-Vergleich in beiden Modi. |
| **M4 — Admin + Kunde** | Admin-UI fuer Brands (CRUD wie Skills), Kunden-Brand seeden, Kunden-Instanz auf eigenes CD umstellen. | Kunden-Instanz zeigt nur Kunden-Brand. |

M1 ist bewusst inert (entspricht dem Prinzip: erst Foundation, Hot-Path zuletzt hinter Gate).

---

## 9. Offene Entscheidungen

| # | Frage | Empfehlung |
|---|-------|------------|
| 1 | Voice in der Brand-Registry **oder** weiter in Brainsidian Voice-Reference? | Kurzform (Kern-Regeln) in Registry fuer Self-Containment; Brainsidian bleibt Langform-Quelle. |
| 2 | Admin-UI in M1 oder erst M4? | Erst M4 — Seeds reichen fuer die ersten Brands. |
| 3 | Fonts: nur Familien-Namen oder auch `@font-face`/CDN-Links? | Familien + Gewichte als Tokens; Font-Loading bleibt Sache des HTML-Templates/`_base.css`. |
| 4 | Logo als HTML/CSS-String oder Asset-URL (R2)? | Start mit HTML/CSS (heutiger Stand). Bild-Logos (Kunden) → spaeter optionaler `logoAssetUrl` (R2), da Binaerdaten nicht in TEXT passen. |

---

## 10. Nicht-Ziele

- Kein Rich-Asset-Management (Bild-Logos, Fonts als Binaerdateien) in M1–M3 — nur Text/Token-basierte Brands.
- Keine Migration der loschke-hub-Datei-Factories als Selbstzweck — nur die in dieser Instanz tatsaechlich genutzten Factories werden brand-neutral importiert.
- Keine Aenderung an `extract_branding` oder Design Studio.
