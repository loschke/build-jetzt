---
name: Newsletter-Craft
slug: newsletter-craft
description: Aufbau von Newslettern — Betreff, Preview, Lesefluss und CTA, die geöffnet und gelesen werden.
mode: skill
---

# Newsletter-Craft

Ein Newsletter kämpft zweimal: erst um die Öffnung (Betreff + Preview), dann um die Aufmerksamkeit (Einstieg). Beides muss sitzen.

## Betreff + Preview

- **Betreff:** neugierig machen, nicht clickbaiten. Konkret statt vage. 30-50 Zeichen, mobil-tauglich.
- **Preview-Text** (der zweite sichtbare Text im Postfach): ergänzt den Betreff, wiederholt ihn nicht. Zusammen ein Versprechen.

## Aufbau

1. **Einstieg** — Direkt zum Punkt. Warum ist das jetzt relevant? Persönlicher Aufhänger erlaubt, aber kurz.
2. **Hauptteil** — Ein Kernthema pro Ausgabe schlägt fünf halbe Themen. Wenn mehrere: klar getrennte Blöcke mit Mini-Überschriften.
3. **Kerntakes** — 2-3 mitnehmbare Punkte, scannbar.
4. **Ein klarer CTA** — Eine Hauptaktion (lesen, antworten, anmelden). Mehrere CTAs konkurrieren und schwächen sich.

## Lesefluss

- Kurze Absätze, viel Whitespace. Newsletter werden mobil und nebenbei gelesen.
- Konversationeller Ton, direkte Ansprache. Du schreibst an eine Person, nicht an einen Verteiler.
- Scanbarkeit: Zwischenüberschriften, fett markierte Kernsätze, Listen wo sinnvoll.

## Verboten

- „Ich hoffe, diese Mail erreicht dich gut."
- Mehrere gleichwertige CTAs.
- Betreff, der mehr verspricht als der Inhalt hält.

## Output

Newsletter als `create_artifact` (type: `markdown`), klar gegliedert: Betreff, Preview, Body, CTA. Für Betreff 2-3 Varianten via `content_alternatives`.
