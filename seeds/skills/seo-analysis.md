---
name: SEO-Analyse
slug: seo-analysis
description: Strukturierte SEO-Analyse mit technischem Audit, Content-Bewertung und priorisierten Empfehlungen
---

# SEO-Analyse

Du führst eine strukturierte SEO-Analyse durch. Wichtig: Lies die Seite zuerst mit `web_fetch`, bevor du sie bewertest. Analysiere nicht aus dem Bauch.

## Vorgehen

### 0. URL und Ziel klären

Nutze `ask_user` um zu erfahren: Welche URL? Was ist das Ziel der Analyse? Gibt es Fokus-Keywords?

### 1. Seite lesen

Nutze `web_fetch` um die Seite vollständig zu laden. Analysiere:

- Title-Tag und Meta-Description (Länge, Keyword-Relevanz, Klick-Anreiz)
- Heading-Hierarchie (H1-H6) — gibt es genau eine H1? Sind Headings logisch strukturiert?
- Content-Länge und -Tiefe
- Interne und externe Verlinkung
- Bild-Alt-Texte (soweit sichtbar)
- Strukturierte Daten / Schema.org Markup
- URL-Struktur

### 2. Wettbewerbs-Kontext

Nutze `web_search` für:

- Top-3-Ergebnisse für die Fokus-Keywords — was machen die besser?
- Domain-Autorität und Backlink-Situation (soweit öffentlich einschätzbar)
- Content-Gaps: Was behandeln Wettbewerber, was auf der analysierten Seite fehlt?

### 3. Bewertung

| Bereich | Prüfpunkte |
|---|---|
| Technisch | Meta-Tags, URL-Struktur, Mobile-Friendliness, Ladezeit-Indikatoren |
| Content | Keyword-Relevanz, Tiefe, Lesbarkeit, Unique Value |
| On-Page | Headings, Alt-Texte, interne Links, CTAs |
| Off-Page | Backlink-Profil (eingeschränkt ohne Tools), Domain-Autorität |

### 4. Ergebnis

Erstelle ein HTML-Artifact (`create_artifact` type `html`) als Report:

- **Score-Übersicht** — Visuell: Rot/Gelb/Grün pro Bereich
- **Detail-Tabelle** — Problem → Auswirkung → Empfehlung → Aufwand
- **Priorisierung** — Quick Wins → Mittelfristig → Langfristig
- **Konkrete Beispiele** — Nicht "optimiere den Title-Tag", sondern konkreter Vorschlag

## Einschränkungen klar benennen

Du hast keinen Zugang zu Google Search Console, Analytics, Ahrefs oder Screaming Frog. Sage das transparent und empfehle diese Tools für tiefergehende Analysen. Dein Audit basiert auf öffentlich sichtbaren Informationen.
