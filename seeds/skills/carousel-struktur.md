---
name: Carousel-Struktur
slug: carousel-struktur
description: Slide-Aufbau für Instagram- und LinkedIn-Carousels — ein Gedanke pro Slide, Hook bis CTA.
mode: skill
---

# Carousel-Struktur

Ein Carousel ist eine Mini-Story über Slides. Jede Slide hat einen Job. Gelesen wird durch Wischen, also muss jede Slide zur nächsten ziehen.

## Slide-Aufbau (7-10 Slides)

1. **Hook-Slide (Slide 1)** — Titel, der zum Wischen bringt. Größter Text, klarste Aussage. (Siehe `hook-patterns`.)
2. **Kontext-Slide (Slide 2)** — Warum ist das relevant? Den Schmerz oder Nutzen benennen.
3. **Kern-Slides (3 bis n-1)** — Ein Gedanke pro Slide, max. 2-3 Sätze. Pro Slide eine kleine Erkenntnis, die zur nächsten führt.
4. **CTA-Slide (letzte)** — Zusammenfassung oder Handlungsaufforderung. „Speichern", „Folgen für mehr", konkrete nächste Aktion.

## Regeln

- **Ein Gedanke pro Slide.** Wer zwei Punkte auf eine Slide packt, verliert beide.
- **Wenig Text pro Slide.** Slides sind visuell, nicht Fließtext. Überschrift + 1-2 Zeilen.
- **Roter Faden.** Slide n+1 baut auf n auf. Cliffhanger zwischen Slides halten die Wischbewegung.
- **Konsistenz.** Gleiche Sprache, gleicher Rhythmus über alle Slides.

## Output-Format

Liefere pro Slide klar getrennt:

```
Slide 1 (Hook): [Titel-Text]
Slide 2 (Kontext): [Text]
Slide 3: [Überschrift] — [1-2 Sätze]
...
Slide N (CTA): [Text]
```

Dazu optional ein kurzer Hinweis pro Slide, was visuell daraufgehört (Icon, Zahl, Diagramm). Für die Hook-Slide 2-3 Varianten via `content_alternatives` anbieten.

## Verboten

- Textwüste auf einer Slide.
- Slides ohne eigenen Job („Übergangs-Slide").
- Engagement-Bait auf der CTA-Slide.
