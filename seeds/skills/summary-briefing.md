---
name: Zusammenfassung & Briefing
slug: summary-briefing
description: Verdichtet lange Texte, Transkripte oder Dokumente zu zielgruppengerechten Briefings.
mode: quicktask
category: Workflow
icon: FileText
outputAsArtifact: true
temperature: 0.4
fields:
  - key: quelltext
    label: Quelltext
    type: textarea
    required: true
    placeholder: "Text, Transkript, Protokoll, Artikel, Dokument — alles reinkippen was zusammengefasst werden soll"
  - key: zweck
    label: Zweck der Zusammenfassung
    type: select
    required: true
    options:
      - Entscheider-Briefing (Kernaussagen + Handlungsempfehlung)
      - Team-Update (was ist passiert, was steht an)
      - Wissenstransfer (Inhalte für jemanden der nicht dabei war)
      - Dokumentation (strukturierte Ablage für später)
      - Vorbereitung (kompakte Grundlage für ein Folgegespräch)
  - key: zielgruppe
    label: Wer liest das?
    type: text
    required: true
    placeholder: "z.B. Geschäftsführung, Projektteam, neuer Kollege, Kunde"
  - key: laenge
    label: Gewünschte Länge
    type: select
    required: true
    options:
      - Kurz (halbe Seite, nur das Wichtigste)
      - Standard (1 Seite)
      - Ausführlich (2-3 Seiten mit Kontext)
---

## Aufgabe

Du verdichtest einen langen Text zu einem Briefing das genau den Zweck erfüllt, den der Nutzer braucht. Ein Entscheider-Briefing sieht fundamental anders aus als ein Wissenstransfer — der Zweck bestimmt Struktur, Tiefe und Tonalität.

## Eingaben

- **Quelltext:** {{quelltext}}
- **Zweck:** {{zweck}}
- **Zielgruppe:** {{zielgruppe}}
- **Länge:** {{laenge}}

## Vorgehen

### 1. Quelltext analysieren

Vor dem Schreiben:
- Typ erkennen (Meeting-Transkript, Artikel, E-Mail-Thread, Report, Rohnotizen?)
- Kernthemen identifizieren (max 3-5)
- Entscheidungen, offene Punkte und Action Items extrahieren (falls vorhanden)
- Irrelevantes filtern (Small Talk, Wiederholungen, Abschweifungen)

### 2. Briefing-Struktur nach Zweck

| Zweck | Struktur |
|---|---|
| Entscheider-Briefing | Kernaussage (1-2 Sätze) → Hintergrund (kompakt) → Optionen/Empfehlung → offene Entscheidungen |
| Team-Update | Status (was ist passiert) → Ergebnisse/Entscheidungen → nächste Schritte → wer macht was |
| Wissenstransfer | Kontext (worum ging es) → Inhalte thematisch gegliedert → Schlussfolgerungen → weiterführende Infos |
| Dokumentation | Datum/Anlass → Teilnehmer/Beteiligte → Themen strukturiert → Entscheidungen → Action Items |
| Vorbereitung | Ausgangslage → offene Punkte → Positionen/Meinungen → Fragestellungen fürs Folgegespräch |

### 3. Briefing erstellen

Erstelle ein `create_artifact` (markdown) mit:

- Klarer Titel der den Inhalt beschreibt (nicht "Zusammenfassung")
- Struktur gemäß Zweck (siehe oben)
- Sprache angepasst an die Zielgruppe (Geschäftsführung ≠ Entwicklerteam)
- Länge einhalten — wenn "Kurz" gewählt ist, maximal eine halbe Seite, auch wenn der Quelltext 10 Seiten lang ist

### 4. Qualitätsregeln

- Kein Informationsverlust bei Entscheidungen und Action Items — die müssen immer rein, egal welche Länge
- Quellenangaben wenn der Quelltext Zahlen, Studien oder Zitate enthält
- Bei mehrdeutigen Aussagen im Quelltext: kennzeichnen statt interpretieren
- Kein "Zusammenfassend lässt sich sagen" — das Briefing ist die Zusammenfassung
