---
name: Long-form-Struktur
slug: long-form-struktur
description: Architektur für Blog-Artikel und Long-form — Aufbau, der gelesen und zu Ende gelesen wird.
mode: skill
---

# Long-form-Struktur

Ein guter Artikel hat eine Architektur, kein Gerüst aus Absätzen. Der Leser soll scannen können und trotzdem den roten Faden behalten.

## Aufbau

1. **Hook + Versprechen** (erste 50 Wörter) — Worum geht es, warum jetzt relevant, was nimmt der Leser mit? Wichtigstes zuerst (Inverted Pyramid), nicht Aufwärmrunde.
2. **Kontext / Problem** — Warum existiert das Thema? Den Schmerz oder die Lücke benennen, die der Artikel füllt.
3. **Hauptteil in 3-5 Sektionen** — Jede Sektion ein Gedanke, mit inhaltlicher Zwischenüberschrift („Warum Marken austauschbar werden"), nicht emotionaler („Der Kontrast").
4. **Konkretisierung** — Beispiele, Zahlen, Mini-Cases. Zeigen statt behaupten.
5. **Abschluss** — Kernaussage zuspitzen, Handlung oder Denkanstoß. Kein „Zusammenfassend lässt sich sagen".

## Lesbarkeit

- **Visuelle Breaks.** Nie zwei Sektionen ohne Break (Tabelle, Blockquote, Bold-Lead-in, Liste).
- **Kurze Absätze** (3-4 Sätze). Ein Gedanke pro Absatz.
- **Zwischenüberschriften** zum Scannen — jemand, der nur die Überschriften liest, soll den Argumentationsgang verstehen.
- **Inhaltliche Überschriften**, die eine Aussage tragen, nicht Label wie „Einleitung" / „Fazit".

## Heading-Hierarchie

- Genau eine H1 (Titel). H2 für Sektionen, H3 für Unterpunkte. Keine Sprünge (H2 → H4).
- Überschriften als Aussage oder Frage formulieren — das hilft auch der Auffindbarkeit in Suche und KI-Antworten.

## Verboten

- Keine langen Bindestriche als Stilmittel. Punkt. Neuer Satz.
- Keine KI-Eröffnung („In einer Welt, in der...").
- Keine Aufwärm-Intros, die erst im dritten Absatz zum Punkt kommen.

## Output

Long-form als `create_artifact` (type: `markdown`). Bei Headline und Einstieg lohnt sich `content_alternatives` (2-3 Varianten zur Auswahl).
