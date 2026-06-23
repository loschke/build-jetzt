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

Erstelle ein HTML-Artifact (`create_artifact` type `html`) als Report. Nutze das folgende einheitliche
Grundgerüst (gleicher Look wie die KI-Content-Analyse, damit alle Audit-Reports visuell konsistent sind)
und fülle es mit:

- **Score-Übersicht** — Karten pro Bereich (Technisch, Content, On-Page, Off-Page), farbcodiert good/warn/bad
- **Detail-Tabelle** — Problem → Auswirkung → Empfehlung → Aufwand
- **Priorisierung** — Quick Wins → Mittelfristig → Langfristig (Prioritäts-Badges)
- **Konkrete Beispiele** — Nicht "optimiere den Title-Tag", sondern konkreter Vorschlag

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SEO-Audit</title>
<style>
  :root{
    --accent:#fa186b; --accent-soft:#fde7f0; --bg:#ffffff; --surface:#f7f8fa;
    --border:#e6e8ec; --text:#16181d; --muted:#6b7280;
    --good:#16a34a; --warn:#f59e0b; --bad:#dc2626;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
       color:var(--text);background:var(--bg);line-height:1.6}
  .wrap{max-width:960px;margin:0 auto;padding:32px 20px}
  header{border-bottom:3px solid var(--accent);padding-bottom:16px;margin-bottom:28px}
  header h1{margin:0 0 4px;font-size:1.7rem}
  header p{margin:0;color:var(--muted)}
  h2{font-size:1.25rem;margin:28px 0 8px}
  .grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:20px 0}
  .card{border:1px solid var(--border);border-radius:12px;padding:16px;background:var(--surface)}
  .card .label{font-size:.8rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
  .score{font-size:2rem;font-weight:700;line-height:1.1}
  .score.good{color:var(--good)} .score.warn{color:var(--warn)} .score.bad{color:var(--bad)}
  .badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.78rem;font-weight:600}
  .badge.cat{background:var(--accent-soft);color:var(--accent)}
  .badge.high{background:#fde8e8;color:var(--bad)}
  .badge.medium{background:#fef3e2;color:var(--warn)}
  .badge.low{background:#eef0f3;color:var(--muted)}
  table{width:100%;border-collapse:collapse;margin:16px 0}
  th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);vertical-align:top}
  th{font-size:.8rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  @media(max-width:768px){.grid{grid-template-columns:1fr 1fr}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>SEO-Audit</h1>
    <p>Quelle und Datum hier einsetzen</p>
  </header>
  <!-- Score-Karten pro Bereich (Klasse good/warn/bad je nach Wert) -->
  <div class="grid"> ... </div>
  <!-- Detail-Tabelle: Problem | Auswirkung | Empfehlung | Aufwand (Prioritäts-Badges) -->
  <!-- Priorisierung: Quick Wins → Mittelfristig → Langfristig -->
</div>
</body>
</html>
```

## Einschränkungen klar benennen

Du hast keinen Zugang zu Google Search Console, Analytics, Ahrefs oder Screaming Frog. Sage das transparent und empfehle diese Tools für tiefergehende Analysen. Dein Audit basiert auf öffentlich sichtbaren Informationen.
