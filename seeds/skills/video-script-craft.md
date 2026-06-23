---
name: Video-Script-Craft
slug: video-script-craft
description: Skripte für Kurzvideos und YouTube — 3-Sekunden-Hook, Struktur, Sprechtext und Visual-Hinweise.
mode: skill
---

# Video-Script-Craft

Video verzeiht keinen langsamen Start. Die ersten 3 Sekunden entscheiden über Weiterschauen. Skript heißt: Sprechtext plus, was man sieht.

## Aufbau (Kurzvideo / Reel / Short)

1. **Hook (0-3 Sek)** — Sofort Spannung. Aussage, Frage oder visueller Bruch. Kein Intro, kein „Hi, in diesem Video...".
2. **Setup (3-10 Sek)** — Worum geht's, warum dranbleiben. Das Versprechen.
3. **Payoff (Mittelteil)** — Der Inhalt. Ein Punkt klar, oder 3 schnelle Punkte mit Tempo.
4. **CTA (Schluss)** — Eine Aktion: folgen, kommentieren, Link. Kurz.

## Aufbau (YouTube Long-form)

- **Hook (erste 15 Sek):** Was lernt der Zuschauer, warum dieses Video. Vorschau auf den Payoff.
- **Kapitel:** klar getrennte Abschnitte, jeweils mit Mini-Hook am Anfang gegen Abspringen.
- **Pattern-Interrupts:** Wechsel in Bild/Ton/Tempo alle 20-40 Sek.
- **Abschluss:** Zusammenfassung + nächster Schritt / nächstes Video.

## Skript-Format

Zweispaltig denken — Sprechtext und Bild getrennt:

```
[VISUAL: was man sieht — Setting, B-Roll, Text-Overlay]
SPRECHTEXT: was gesagt wird
```

## Regeln

- Gesprochene Sprache, kurze Sätze. Man hört, man liest nicht.
- Ein Gedanke pro Satz. Pausen einplanen.
- Text-Overlays für Kernaussagen (viele schauen ohne Ton).
- Hook zuerst schreiben, dann den Rest. Wenn der Hook nicht zieht, ist der Rest egal.

## Verboten

- Langes Intro / Begrüßungs-Schleife vor dem Hook.
- „Vergesst nicht zu liken und zu abonnieren" als einziger Inhalt.

## Output

Skript als `create_artifact` (type: `markdown`), Sprechtext und Visual-Hinweise getrennt. Für den Hook 2-3 Varianten via `content_alternatives`.
