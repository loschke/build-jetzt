---
name: Website analysieren
slug: website-analysis
description: Liest eine Website und erstellt eine strukturierte Analyse — Inhalt, Technik, UX und Verbesserungsvorschläge.
mode: quicktask
category: Analyse & Strategie
icon: Globe
outputAsArtifact: true
temperature: 0.5
fields:
  - key: url
    label: Website-URL
    type: text
    required: true
    placeholder: "https://beispiel.de"
  - key: fokus
    label: Analyse-Fokus
    type: select
    required: true
    options:
      - Gesamtüberblick
      - Content & Messaging
      - Technik & SEO
      - UX & Conversion
  - key: kontext
    label: Kontext
    type: textarea
    placeholder: "Optional: Was ist der Anlass? Relaunch geplant? Wettbewerber analysieren?"
---

## Aufgabe

Du analysierst eine Website systematisch und lieferst ein strukturiertes Ergebnis.

## Eingaben

- **URL:** {{url}}
- **Fokus:** {{fokus}}
- **Kontext:** {{kontext | default: "kein zusätzlicher Kontext"}}

## Vorgehen

1. **Seite lesen:** Nutze `web_fetch` um die Seite vollständig zu laden. Analysiere den tatsächlichen Inhalt, nicht dein Vorwissen über die Domain.

2. **Analysiere** je nach Fokus:

   **Gesamtüberblick:** Alle Bereiche oberflächlich — wer ist die Zielgruppe, was ist die Kernbotschaft, wie ist die technische Qualität?

   **Content & Messaging:** Klarheit der Botschaft, Tonalität, Zielgruppen-Passung, Content-Lücken, Headline-Qualität, CTAs.

   **Technik & SEO:** Meta-Tags, Heading-Struktur, URL-Aufbau, Mobile-Hinweise, strukturierte Daten, Ladezeit-Indikatoren.

   **UX & Conversion:** Navigation, Nutzerführung, Call-to-Actions, Vertrauenselemente, Conversion-Pfade.

3. **Erstelle einen HTML-Report** (`create_artifact` type `html`). Nutze das folgende einheitliche
   Grundgerüst (gleicher Look wie SEO-Audit und KI-Content-Analyse, damit alle Reports konsistent sind):
   - Übersicht mit Score pro Bereich (Karten, farbcodiert good/warn/bad)
   - Detailanalyse mit konkreten Beispielen aus der Seite
   - Priorisierte Handlungsempfehlungen (Prioritäts-Badges)

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Website-Analyse</title>
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
    <h1>Website-Analyse</h1>
    <p>URL und Datum hier einsetzen</p>
  </header>
  <!-- Score-Karten pro Bereich (Klasse good/warn/bad je nach Wert) -->
  <div class="grid"> ... </div>
  <!-- Detailanalyse mit konkreten Beispielen aus der Seite -->
  <!-- Priorisierte Handlungsempfehlungen (Prioritäts-Badges) -->
</div>
</body>
</html>
```

## Wichtig

- Analysiere was du siehst, nicht was du vermutest. Lies die Seite.
- Gib konkrete Beispiele: "Der Title-Tag lautet 'Home' — besser wäre 'Produkt X | Firma Y'"
- Sei ehrlich bei Lücken: "Ohne Zugang zu Analytics kann ich Traffic nicht einschätzen"
