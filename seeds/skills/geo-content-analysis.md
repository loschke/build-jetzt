---
name: GEO-Content-Analyse
slug: geo-content-analysis
description: GEO-Analyse — bewertet Content auf KI-Sichtbarkeit (AI Overviews, ChatGPT Search, Perplexity) und liefert Score, Verbesserungen und Content-Lücken als HTML-Report.
mode: skill
---

# GEO-Content-Analyse

Du bewertest Web-Content auf **KI-Tauglichkeit** (Generative Engine Optimization). Die Frage: Wie gut
wird dieser Inhalt von AI Overviews, ChatGPT Search und Perplexity verstanden und zitiert? Ergebnis ist
ein strukturierter HTML-Report mit Scores, konkreten Verbesserungen und strategischen Content-Lücken.

## Schritt 0 — Umfang klären (ask_user)

Bevor du analysierst, kläre mit dem `ask_user` Tool, was fehlt. Hat der Nutzer Input und Umfang bereits
genannt, überspringe die jeweilige Frage und leg direkt los. Sonst frag strukturiert:

- **Input** (falls weder URL noch Text vorliegt): „Welche Seite oder welcher Text soll analysiert werden?"
- **Umfang** (Auswahl):
  - Vollanalyse (Strategie + Operativ + Lücken)
  - Nur bestimmte Abschnitte (welche?)
  - Nur eine Dimension (Score / Operativ / Lücken)

Wenn der Input eine URL ist, lies die Seite zuerst mit `web_fetch`. Ist es bereits Text/Markdown, arbeite
direkt damit. Analysiere den tatsächlichen Inhalt, nicht dein Vorwissen über die Domain. Ist der Content
kürzer als ~50 Zeichen oder leer, sag das klar statt zu raten.

## Die 4 KI-Content-Prinzipien (fachlicher Kern)

1. **Antwort-First-Prinzip** — Die wichtigste Information steht in den ersten 30 bis 50 Wörtern.
2. **Struktur als Zitierstrategie** — Klare Hierarchien (`#` `##` `###`), FAQ-Elemente, Tabellen, Listen.
3. **Explizite Autorität** — Faktische Belege statt Marketing-Aussagen, konkrete Zahlen und Daten.
4. **KI-Context** — Definitionen, strukturierte Daten, zitierbare Einzelaussagen ohne Kontextbedarf.

## Bewertungsskala (0–10)

- 0–2: Völlig ungeeignet für KI-Systeme
- 3–4: Große Probleme, umfassende Überarbeitung nötig
- 5–6: Mittelmäßig, deutliche Verbesserungen möglich
- 7–8: Gut, kleinere Optimierungen sinnvoll
- 9–10: Exzellent, KI-ready

## Vorgehen je nach Umfang

- **Vollanalyse:** alle drei Schritte (Strategie → Operativ → Lücken).
- **Bestimmte Abschnitte:** Splitte den Content an den Überschriften, bearbeite nur die genannten Teile.
- **Eine Dimension:** Führe nur den genannten Schritt aus (Score / Operativ / Lücken).

### Schritt 1 — Strategie-Analyse

Bewerte 4 Dimensionen je 0–10 und einen Gesamtscore:

- **answerFirst** — Steht die wichtigste Info in den ersten 50 Wörtern?
- **structuralClarity** — Sind Überschriften, Listen, Tabellen erkennbar und logisch?
- **factualDensity** — Konkrete Zahlen und Fakten statt Marketing-Aussagen?
- **citability** — Sind Einzelaussagen ohne Kontext verständlich und zitierbar?

Liefere zusätzlich: **Stärken** (max. 3), **kritische Probleme** (sofort zu beheben),
**Handlungsempfehlungen** (je mit Kategorie `structure` | `content` | `authority` | `context`,
Priorität `high` | `medium` | `low`, konkreter Aktion, erwartetem Impact), **Content-Lücken**
(welche wichtigen Infos fehlen komplett) und eine kurze **Begründung** des Gesamtscores.

### Schritt 2 — Operative Verbesserungen (Before/After)

Konkrete Textverbesserungen für die wichtigsten Problemstellen. Pro Vorschlag: Original-Text →
verbesserter Text, Kategorie, Priorität, Begründung (warum das die KI-Tauglichkeit erhöht) und der
betroffene Abschnitt. Konzentriere dich auf 5–10 hochwertige Verbesserungen, nicht auf jede Kleinigkeit.
Hebe die 3–5 wichtigsten als **Quick Wins** hervor.

**Kategorien:**
- **MISSING** — Wichtige Informationen fehlen (Preise, Zahlen, Fakten)
- **REWRITE** — Marketing-Sprache in klare Aussagen umformulieren
- **STRUCTURE** — Überschriften, Absätze, Listen optimieren
- **CONTEXT** — Fachbegriffe definieren, Kontext ergänzen

**Beispiele guter Transformationen:**

MISSING – Preise:
- ❌ „Kostengünstige Lösung"
- ✅ „Ab 49€ pro Nutzer monatlich"

REWRITE – Marketing zu Fakten:
- ❌ „Innovative CRM-Software revolutioniert Kundenbeziehungen"
- ✅ „CRM-Software mit Lead-Scoring, Pipeline-Management und E-Mail-Automation"

STRUCTURE – Antwort-First:
- ❌ „In der heutigen digitalen Welt... Nach umfangreicher Analyse... Die Lösung kostet 200€"
- ✅ „Die Software kostet 200€ pro Monat. In der digitalen Transformation..."

CONTEXT – Definitionen:
- ❌ „Unsere API-Integration"
- ✅ „API-Integration (automatischer Datenaustausch zwischen verschiedenen Software-Systemen)"

### Schritt 3 — Content-Lücken (strategische Erweiterung)

Vier Fokus-Bereiche:

1. **FAQ-Empfehlungen** — Voice-Search-optimierte Fragen („Wie...", „Was ist...", „Warum..."), je mit
   strukturierter Antwort, Suchintention (informational | navigational | transactional) und Priorität.
2. **Überschriften-Optimierung** — Bestehende Überschriften als natürlichsprachige Fragen formulieren,
   je mit Begründung und geschätztem Suchvolumen (high | medium | low).
3. **Verwandte Themen** — Content-Opportunities mit empfohlenem Content-Typ (article | faq | guide |
   comparison | tutorial), Priorität, Begründung und Keyword-Chance.
4. **Content-Cluster-Strategie** — Übergeordnete Cluster-Themen mit konkreten Artikel-Ideen,
   interner Verlinkungsstrategie und Wirkung auf die Topical Authority.

Schließe mit einer kurzen Gesamt-Strategie.

## Output: ein HTML-Report (`create_artifact` type `html`)

Erstelle **einen** HTML-Report mit dem folgenden, einheitlichen Look (gleicher Stil wie der SEO-Audit,
damit alle Reports visuell konsistent sind). Übernimm das Grundgerüst und fülle es mit den Analyse-Inhalten.
Bei Teil-/Einzel-Analysen nur die relevanten Sektionen rendern.

```html
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GEO-Content-Analyse</title>
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
  .ba{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .ba .before{color:var(--muted)}
  .ba .after{border-left:3px solid var(--good);padding-left:12px}
  .tabs{display:flex;gap:4px;border-bottom:1px solid var(--border);margin:24px 0 0;flex-wrap:wrap}
  .tab{padding:10px 16px;cursor:pointer;border:none;background:none;font:inherit;color:var(--muted);
       border-bottom:2px solid transparent}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent);font-weight:600}
  .panel{display:none;padding:16px 0} .panel.active{display:block}
  @media(max-width:768px){.ba{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>GEO-Content-Analyse</h1>
    <p>Quelle und Datum hier einsetzen</p>
  </header>

  <!-- Score-Übersicht: Gesamtscore + 4 Dimensionen als Karten. Klasse good/warn/bad je nach Wert. -->
  <div class="grid"> ... </div>

  <!-- Stärken / kritische Probleme / Empfehlungen (mit Kategorie- und Prioritäts-Badges) -->

  <!-- Operative Verbesserungen: Before/After über .ba-Grid oder Tabelle, Quick Wins zuerst -->

  <!-- Content-Lücken in Tabs: FAQ / Überschriften / Verwandte Themen / Cluster -->
  <div class="tabs">
    <button class="tab active" data-panel="faq">FAQ</button>
    <button class="tab" data-panel="headings">Überschriften</button>
    <button class="tab" data-panel="topics">Verwandte Themen</button>
    <button class="tab" data-panel="cluster">Content-Cluster</button>
  </div>
  <div id="faq" class="panel active"> ... </div>
  <div id="headings" class="panel"> ... </div>
  <div id="topics" class="panel"> ... </div>
  <div id="cluster" class="panel"> ... </div>
</div>
<script>
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.panel).classList.add('active');
  }));
</script>
</body>
</html>
```

## Wichtig

- Analysiere was du siehst, nicht was du vermutest. Lies die Seite oder den Text.
- Konkrete Beispiele statt abstrakter Tipps. Nenne den betroffenen Abschnitt.
- Score farbcodiert: 7–10 = good (grün), 5–6 = warn (gelb), 0–4 = bad (rot).
- Im Chat eine kurze Zusammenfassung geben (Gesamtscore + Top-3 Quick Wins), kein rohes JSON.
