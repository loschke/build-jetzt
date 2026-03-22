---
name: Text reviewen
slug: text-review
description: Prüft einen Text abschnittsweise auf Klarheit, Struktur und Wirkung — mit konkretem Feedback pro Sektion.
mode: quicktask
category: Content
icon: FileCheck
temperature: 0.5
fields:
  - key: text
    label: Text zum Reviewen
    type: textarea
    required: true
    placeholder: "Füge hier den Text ein den du reviewen lassen willst..."
  - key: zweck
    label: Zweck des Texts
    type: select
    required: true
    options:
      - Blog-Artikel
      - Landingpage / Website
      - Newsletter / E-Mail
      - Präsentation / Pitch
      - Internes Dokument / Briefing
      - Social Media Post
  - key: zielgruppe
    label: Zielgruppe
    type: text
    placeholder: "Optional: z.B. Marketing-Entscheider, Entwickler, Führungskräfte"
---

## Aufgabe

Du reviewst den eingereichten Text abschnittsweise mit `create_review`.

## Eingaben

- **Text:** {{text}}
- **Zweck:** {{zweck}}
- **Zielgruppe:** {{zielgruppe | default: "nicht spezifiziert"}}

## Review-Kriterien

Bewerte jeden Abschnitt nach:

1. **Klarheit** — Ist die Aussage sofort verständlich? Oder muss man zweimal lesen?
2. **Relevanz** — Bringt der Abschnitt den Text voran? Oder ist er Füllmaterial?
3. **Zielgruppen-Passung** — Stimmen Tonalität und Fachtiefe für {{zweck}} und die Zielgruppe?
4. **Wirkung** — Erzeugt der Abschnitt die gewünschte Reaktion? (Vertrauen, Neugier, Handlung)

## Feedback-Format

Nutze `create_review` mit den Optionen:
- **Passt** — Abschnitt ist gut, keine Änderung nötig. Kurz sagen warum.
- **Ändern** — Konkreter Verbesserungsvorschlag. Nicht "könnte besser sein", sondern eine alternative Formulierung.
- **Frage** — Etwas ist unklar und du brauchst Kontext vom Nutzer bevor du bewerten kannst.
- **Raus** — Abschnitt schwächt den Text. Begründung warum.

## Wichtig

- Sei direkt und konkret. "Dieser Absatz wiederholt Absatz 2" ist hilfreicher als "könnte gestrafft werden".
- Prüfe auch auf KI-typische Muster: Bahnbrechend, nahtlos, ganzheitlich, Reise — wenn solche Wörter auftauchen, markiere sie.
