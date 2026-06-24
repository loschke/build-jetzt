---
name: Infografik
slug: infographic
description: Erzeugt flache, minimalistische Infografik-BILDER (Bildgenerierung) für queo, queonext und AOK/Gesundheitswelt. Deutschsprachig, brand-konform, mit optionaler Recherche und Qualitäts-Review-Schleife. Fragt Brand und Typ ab, wenn nicht im Prompt genannt.
mode: skill
---

# Infografik (Bild) – Flat & Minimalistisch · queo-Gruppe

Erzeugt **ein Infografik-Bild** per Bildgenerierung — flach, minimalistisch, deutschsprachig, brand-konform. Pipeline angelehnt an einen Generieren-→-Prüfen-→-Verbessern-Loop mit optionaler Recherche.

Brands: **queo** (default), **queonext**, **aok** (Gesundheitswelt).

## Wichtig: welches Tool

- Bild **immer** mit dem eingebauten **`generate_image`**-Tool erzeugen (rendert als echtes Bild-Artefakt).
- **Nicht** über MCP-Bildtools (z.B. Higgsfield) erzeugen — deren Ergebnisse rendern in dieser Plattform nicht zuverlässig.
- Recherche über `web_search` bzw. `deep_research`. Voraussetzung: Bild- und (optional) Web-Features sind in der Instanz aktiv.

## Schritt 0: Brand + Typ festlegen — immer zuerst

- Stehen **Brand** (queo/queonext/aok) und **Infografik-Typ** schon im Prompt → direkt verwenden.
- Sonst **zuerst `ask_user`** aufrufen: Brand (queo / queonext / AOK), Typ (s. Typen-Liste) und **Umfang** (s. Ausgabe-Umfang). Seitenverhältnis optional miterfragen (Hoch/Quer/Quadrat).
- **Umfang-Default ist „Plain"** (nur die Information) — Titel/Fußzeile nur auf Wunsch oder wenn die Grafik klar standalone ist.

## Stil-Doktrin (in JEDEN Generierungs-Prompt schreiben)

**Flat und minimalistisch — nicht verhandelbar.**

- 2D-Vektor-Look, flache Farbflächen. **Kein** 3D, keine Render-Optik, keine Fotos, keine Glows, keine Glanz-/Bevel-Effekte, keine Verlaufs-Deko.
- **Eine** Akzentfarbe sparsam (Hero-Zahl, wenige Marker). Sonst ruhige Brand-Flächen.
- Viel Weißraum, klare Raster, schlichte Line-Icons (einfarbig), flache Charts (Balken/Donut/Linie ohne 3D).
- **Sprache: Deutsch mit echten Umlauten** (ä/ö/ü/ß — NICHT ae/oe/ue/ss). Moderne Bildmodelle rendern Umlaute sauber. Ansprache „Du".
- **Text knapp halten** (Bildmodelle verhunzen viel Text) — kurze Labels, große Zahlen.

## Ausgabe-Umfang — Default: Plain

Infografiken werden meist **in Content, Erläuterungen oder Präsentationen eingebettet** — der umgebende Text liefert dann Titel und Kontext. Grundmodus ist deshalb **„Plain": nur die Information selbst.**

- **Plain (Default):** nur die Kern-Visualisierung (Zahlen, Chart, Liste, Schritte, Vergleich) mit den nötigen Labels. **Kein** Kicker, **keine** Titelzeile, **keine** Fußzeile, **kein** Quelle/Logo. Knappe, gleichmäßige Ränder, neutraler/heller Hintergrund (oder transparent, wenn das Tool es kann) — zum sauberen Einbetten. Brand-Look (Akzentfarbe, Typo) bleibt erhalten.
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

**queo (default) — Graublau + Gold, sachlich-premium**
- Hintergrund: helles Off-White / dezentes Graublau (#EEF1F3); Variante dunkel: Graublau #161D23.
- Akzent (sparsam): Gold #9E7457 (auf dunkel etwas heller, #B3895F).
- Text: dunkles Slate #2A343B (hell) bzw. Weiß (dunkel); gedämpft #7C8893.
- Logo (Footer, dezent): Wortmarke „queo" + Akzent-Punkt → „queo."

**queonext — Neutral + Pink, modern**
- Hintergrund: Weiß / helles Neutralgrau (#F4F5F6); Variante dunkel: #15181C.
- Akzent: Pink #FA186B.
- Text: #2B3138 (hell) / Weiß (dunkel); gedämpft #69727D.
- Logo: „queonext" (Wortmarke).

**aok / Gesundheitswelt — Grün, vertrauenswürdig**
- Hintergrund: Weiß / sehr helles Grün (#EEF4F0); Variante dunkel: #0F1714.
- Akzent: AOK-Grün #006E46. Lime #91F54A **nur als winziger Highlight** (Punkt, Marker), **nie** als Fläche.
- Text: #22272A (hell) / Weiß (dunkel); gedämpft #6A7A72.
- Logo: „AOK".

Default-Modus: **hell** (queo/queonext/aok sind light-nativ); auf Wunsch dunkel.
Typografie: klare, flache Grotesk (z.B. Inter-artig). Headline fett, Hero-Zahl sehr groß. (Echte Brand-Fonts FF Clan / AOK Buenos Aires sind lizenzpflichtig → im Bild eine neutrale Grotesk.)

## Master-Prompt-Vorlage (Englisch + deutsche Labels)

**Plain (Default) — nur die Information, ohne Titel/Fußzeile:**

```
Flat, minimalist 2D vector infographic, [TYP-LAYOUT]. ONLY the core visualisation
with its data labels — NO title block, NO kicker/heading, NO footer, NO source line,
NO logo. Clean, tight even margins, neutral [BRAND-BG] (or transparent) background
so it embeds into a document or slide.
No 3D, no photorealism, no glow/bevel/gloss, no decorative gradients.
Brand palette: single accent [BRAND-ACCENT] used sparingly, text in [BRAND-TEXT],
muted labels [BRAND-MUTED]. Simple monochrome line icons. Flat charts only.
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
- [ ] Brand-Look getroffen (richtige Akzentfarbe, sparsam; AOK-Lime nur winzig)?
- [ ] Text **lesbar** und **deutsch**, keine verstümmelten Wörter?
- [ ] Zahlen **exakt** wie in Quelle/Recherche?
- [ ] Klare Lese-Hierarchie, ruhige Komposition (Wichtigstes zuerst)?
- [ ] Umfang stimmt: **Plain ohne Titel/Fußzeile** (Default) — Titel/Fußzeile nur wenn gewünscht?

## Barrierefreiheit

Auf ausreichenden Kontrast achten. Bei kategorialen Daten möglichst unterscheidbare, colorblind-freundliche Werte wählen (nicht allein über Farbe kodieren — Form/Label ergänzen).

## Workflow (kurz)

1. Brand + Typ (ask_user, falls nicht im Prompt) · ggf. Seitenverhältnis.
2. (Optional) Recherche → exakte Daten + Quelle.
3. Inhalt strukturieren (Verbatim-Regel).
4. Master-Prompt mit Stil-Doktrin + Brand-Look + deutschen Labels bauen.
5. `generate_image` aufrufen.
6. Gegen Checkliste prüfen, bei Bedarf nachschärfen & neu generieren (max. 3).
