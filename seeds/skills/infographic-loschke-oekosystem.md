---
name: Infografik
slug: infographic
description: Erzeugt flache, minimalistische Infografik-BILDER (Bildgenerierung) für loschke.ai, unlearn.how und lernen.diy. Deutschsprachig, brand-konform (Dark Mode), mit optionaler Recherche und Qualitäts-Review-Schleife. Fragt Brand und Typ ab, wenn nicht im Prompt genannt.
mode: skill
---

# Infografik (Bild) – Flat & Minimalistisch · loschke-Ökosystem

Erzeugt **ein Infografik-Bild** per Bildgenerierung — flach, minimalistisch, deutschsprachig, brand-konform. Pipeline angelehnt an einen Generieren-→-Prüfen-→-Verbessern-Loop mit optionaler Recherche.

Brands: **loschke.ai** (default), **unlearn.how**, **lernen.diy**.

## Wichtig: welches Tool

- Bild **immer** mit dem eingebauten **`generate_image`**-Tool erzeugen (rendert als echtes Bild-Artefakt).
- **Nicht** über MCP-Bildtools (z.B. Higgsfield) erzeugen — deren Ergebnisse rendern in dieser Plattform nicht zuverlässig.
- Recherche über `web_search` bzw. `deep_research`. Voraussetzung: Bild- und (optional) Web-Features sind in der Instanz aktiv.

## Schritt 0: Brand + Typ festlegen — immer zuerst

- Stehen **Brand** (loschke/unlearn/lernen) und **Infografik-Typ** schon im Prompt → direkt verwenden.
- Sonst **zuerst `ask_user`** aufrufen: Brand (loschke.ai / unlearn.how / lernen.diy), Typ (s. Typen-Liste) und **Umfang** (s. Ausgabe-Umfang). Seitenverhältnis optional miterfragen (Hoch/Quer/Quadrat).
- **Umfang-Default ist „Plain"** (nur die Information) — Titel/Fußzeile nur auf Wunsch oder wenn die Grafik klar standalone ist.

## Stil-Doktrin (in JEDEN Generierungs-Prompt schreiben)

**Flat und minimalistisch — nicht verhandelbar.**

- 2D-Vektor-Look, flache Farbflächen. **Kein** 3D, keine Render-Optik, keine Fotos, keine Glows, keine Glanz-/Bevel-Effekte, keine Verlaufs-Deko.
- **Eine** Akzentfarbe sparsam (Hero-Zahl, wenige Marker). Sonst ruhige, dunkle Brand-Flächen.
- Viel Negativraum, klare Raster, schlichte Line-Icons (einfarbig), flache Charts (Balken/Donut/Linie ohne 3D).
- **Sprache: Deutsch mit echten Umlauten** (ä/ö/ü/ß — NICHT ae/oe/ue/ss). Moderne Bildmodelle rendern Umlaute sauber. Ansprache „Du".
- **Text knapp halten** (Bildmodelle verhunzen viel Text) — kurze Labels, große Zahlen.

## Ausgabe-Umfang — Default: Plain

Infografiken werden meist **in Content, Erläuterungen oder Präsentationen eingebettet** — der umgebende Text liefert dann Titel und Kontext. Grundmodus ist deshalb **„Plain": nur die Information selbst.**

- **Plain (Default):** nur die Kern-Visualisierung (Zahlen, Chart, Liste, Schritte, Vergleich) mit den nötigen Labels. **Kein** Kicker, **keine** Titelzeile, **keine** Fußzeile, **kein** Quelle/Logo. Knappe, gleichmäßige Ränder, ruhiger dunkler Brand-Hintergrund (oder transparent, wenn das Tool es kann) — zum sauberen Einbetten. Brand-Look (Akzentfarbe, Typo) bleibt erhalten.
- **+ Titel (optional):** nur wenn die Grafik **standalone** steht. Dann Kicker + Headline oben.
- **+ Fußzeile (optional, selten):** nur bei standalone/teilbaren Assets und wenn Quelle oder Logo wirklich gebraucht werden. **Standard: weglassen** — besonders das Logo.

Faustregel: eingebettet → Plain. Standalone-Post / Slide-Aufmacher → + Titel (+ ggf. Fußzeile).

## Pipeline

### 1. (Optional) Recherche

Wenn das Thema **aktuelle/präzise Daten** braucht und der Nutzer sie nicht mitliefert: mit `web_search` oder `deep_research` 5–8 belastbare Fakten/Zahlen + Quellen holen (Fokus 2024–2026). Zahlen **wörtlich** übernehmen, nie schätzen oder runden ohne Hinweis.

### 2. Inhalt strukturieren

- Typ wählen (s.u.), Kernbotschaft in einem Satz.
- **Verbatim-Regel:** alle Zahlen, Zitate, Fakten exakt übernehmen — nicht umformulieren.
- Struktur **Plain** (Default): nur die Kern-Visualisierung — je nach Typ Hero-Zahl + KPIs, Schritte, Liste, Vergleich oder Chart — mit knappen Labels. Eine Botschaft, keine Titel-/Fußzeile.
- **Nur bei „+ Titel":** Kicker + Headline oben ergänzen. **Nur bei „+ Fußzeile":** Quelle und/oder Logo unten. Sonst beides weglassen.

### 3. Generierungs-Prompt bauen

Den Prompt fürs Bildmodell auf Englisch für Struktur/Stil formulieren, **aber die exakten deutschen Textlabels wörtlich** mitgeben („render this exact German text: …"). Bausteine: Stil-Doktrin + Brand-Look (s.u.) + Typ-Layout + Seitenverhältnis + exakte Labels/Zahlen + „legible text, accurate numbers, no gibberish".

### 4. Generieren

`generate_image` mit dem fertigen Prompt aufrufen.

### 5. Review & Iteration (max. 3 Durchläufe)

Ergebnis gegen die **Qualitäts-Checkliste** prüfen (s.u.). Wenn ein Punkt klar verfehlt ist (Text unleserlich, Zahl falsch, nicht flat, off-brand): Prompt gezielt nachschärfen und neu generieren. Wenn die Qualität passt → fertig. Falls das Bild nicht selbst bewertbar ist, dem Nutzer zeigen und gezielte Nachbesserung anbieten.

## Infografik-Typen

| Typ | Wofür | Flaches Layout |
| --- | --- | --- |
| `statistik` | Zahlen, KPIs, Umfragen | Hero-Zahl, KPI-Kacheln, ein flacher Chart |
| `timeline` | Verlauf, Meilensteine | vertikale/horizontale Linie, Punkte, Jahr + Kurztext |
| `prozess` | Schritt-für-Schritt | nummerierte Schritte, dünne Pfeile |
| `vergleich` | A vs. B, Vorher/Nachher | zwei Spalten, Haken/Kreuz |
| `liste` | Tipps, Top-N, Checkliste | nummerierte Zeilen, Akzent auf Nummer |
| `hierarchie` | Ebenen, Pyramide, Struktur | gestapelte Ebenen / Baum, dünne Linien |
| `geo` | regionale Daten | schlichte Karte, Farbcodierung, Legende |
| `metapher` | komplexes via Bildanalogie | zentrale Form, beschriftete Teile (flach, nicht verspielt) |

## Brand-Look (in den Prompt einbauen)

Das loschke-Ökosystem ist **Dark Mode** (Default-Modus dunkel).

**loschke.ai (default) — Schwarz/Orange, visionär-direkt**
- Hintergrund: nahezu schwarz #151416, Fläche-alt #1E1E20.
- Akzent (sparsam): Orange #FC2D01.
- Text: Weiß; gedämpft warmgrau #CFCAB4.
- Logo (Footer, dezent): „RL" in Weiß + Punkt in Orange → „RL."

**unlearn.how — Purple, anstiftend**
- Hintergrund: sehr dunkles Violett #0F0A15, Fläche-alt #1A1225.
- Akzent: Purple #A855F7.
- Text: #F5F0FF; gedämpft #A090B5.
- Logo: „unlearn" kursiv + „.how" in Purple.

**lernen.diy — Teal, Werkstatt-Meister**
- Hintergrund: sehr dunkles Teal-Schwarz #0F1514, Fläche-alt #1A2220.
- Akzent: Teal #0F766E.
- Text: Weiß; gedämpft #9FBAB6.
- Logo: „lernen" + „.diy" kursiv in Teal.

Typografie: Headlines **Noto Sans Black (900)**, Body Noto Sans. Für unlearn.how / lernen.diy Labels/Sublines optional **Instrument Serif** (Akzent-Anmutung). Hero-Zahl sehr groß und fett.

## Master-Prompt-Vorlage (Englisch + deutsche Labels)

**Plain (Default) — nur die Information, ohne Titel/Fußzeile:**

```
Flat, minimalist 2D vector infographic, dark background, [TYP-LAYOUT].
ONLY the core visualisation with its data labels — NO title block, NO kicker/heading,
NO footer, NO source line, NO logo. Clean, tight even margins, calm dark [BRAND-BG]
(or transparent) background so it embeds into a document or slide.
No 3D, no photorealism, no glow/bevel/gloss, no decorative gradients.
Brand palette: single accent [BRAND-ACCENT] used sparingly, text in white/[BRAND-MUTED].
Simple monochrome line icons. Flat charts only.
Aspect ratio [RATIO]. High legibility, accurate numbers, no gibberish text.
Use correct German spelling with proper umlauts (ä ö ü ß), never ae/oe/ue/ss.
Render these EXACT German labels verbatim: [Daten / Werte / Schritt- bzw. Zeilen-Labels …].
```

**Optionale Zusätze** (nur wenn gewünscht, an den Prompt anhängen):

- Titel: `Add a header at the top: small kicker "[…]" and a bold headline "[…]".`
- Fußzeile: `Add a small footer: source "[…]" bottom-left and small wordmark logo "[BRAND-LOGO]" bottom-right.`

## Format / Seitenverhältnis

| Einsatz | Ratio |
| --- | --- |
| Web/Blog (default) | quadratisch 1:1 oder 4:5 |
| Social Story | hoch 9:16 |
| Präsentation/Quer | 16:9 |

## Qualitäts-Checkliste (Review)

- [ ] Flat/minimalist eingehalten (kein 3D, keine Glows, ruhig)?
- [ ] Brand-Look getroffen (dunkler Grund, richtige Akzentfarbe, sparsam)?
- [ ] Text **lesbar** und **deutsch**, keine verstümmelten Wörter?
- [ ] Zahlen **exakt** wie in Quelle/Recherche?
- [ ] Klare Lese-Hierarchie, ruhige Komposition (Wichtigstes zuerst)?
- [ ] Umfang stimmt: **Plain ohne Titel/Fußzeile** (Default) — Titel/Fußzeile nur wenn gewünscht?

## Barrierefreiheit

Auf ausreichenden Kontrast achten (heller Text auf dunklem Grund). Bei kategorialen Daten möglichst unterscheidbare, colorblind-freundliche Werte wählen (nicht allein über Farbe kodieren — Form/Label ergänzen).

## Workflow (kurz)

1. Brand + Typ (ask_user, falls nicht im Prompt) · ggf. Seitenverhältnis.
2. (Optional) Recherche → exakte Daten + Quelle.
3. Inhalt strukturieren (Verbatim-Regel).
4. Master-Prompt mit Stil-Doktrin + Brand-Look + deutschen Labels bauen.
5. `generate_image` aufrufen.
6. Gegen Checkliste prüfen, bei Bedarf nachschärfen & neu generieren (max. 3).
