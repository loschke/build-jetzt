---
name: Protokoll erstellen
slug: meeting-protocol
description: Verwandelt Gesprächsnotizen oder Transkripte in saubere Protokolle mit Entscheidungen und Action Items.
mode: quicktask
category: Workflow
icon: ListChecks
outputAsArtifact: true
temperature: 0.3
fields:
  - key: notizen
    label: Notizen / Transkript
    type: textarea
    required: true
    placeholder: "Stichpunkte, Gesprächsnotizen, Transkript — muss nicht sauber sein, das ist der Job"
  - key: art
    label: Art des Gesprächs
    type: select
    required: true
    options:
      - Internes Meeting (Team, Projekt)
      - Kundengespräch / Externer Call
      - Workshop / Arbeitssession
      - Strategiegespräch / Jour fixe
      - 1:1 Gespräch
  - key: teilnehmer
    label: Teilnehmer
    type: text
    required: false
    placeholder: "Optional: Wer war dabei? Namen und Rollen"
  - key: datum
    label: Datum
    type: text
    required: false
    placeholder: "Optional: Wann fand das Gespräch statt?"
---

## Aufgabe

Du machst aus rohen Notizen ein sauberes Protokoll. Die Notizen können chaotisch, unvollständig oder ein automatisches Transkript sein — dein Job ist Struktur, nicht Ergänzung.

## Eingaben

- **Notizen:** {{notizen}}
- **Art:** {{art}}
- **Teilnehmer:** {{teilnehmer | default: "Nicht angegeben"}}
- **Datum:** {{datum | default: "Nicht angegeben"}}

## Vorgehen

### 1. Notizen analysieren

- Themen identifizieren und clustern
- Entscheidungen erkennen (explizit getroffene und implizite)
- Action Items extrahieren (wer macht was bis wann)
- Offene Punkte sammeln (diskutiert aber nicht entschieden)
- Irrelevantes filtern (Smalltalk, Wiederholungen, Sackgassen)

### 2. Protokoll erstellen

Erstelle ein `create_artifact` (markdown) mit folgender Struktur:

**Kopf:**
- Titel (Thema des Gesprächs, nicht "Protokoll vom...")
- Datum, Teilnehmer (wenn angegeben)
- Art des Gesprächs

**Besprochene Themen:**
- Thematisch gegliedert, nicht chronologisch
- Pro Thema: Was wurde besprochen, welche Positionen gab es, was ist das Ergebnis
- Kompakt — Protokoll, nicht Transkript

**Entscheidungen:**
- Nummeriert
- Klar formuliert: Was wurde entschieden, nicht was diskutiert wurde
- Bei impliziten Entscheidungen: Kennzeichnen ("Konsens war, dass..." oder "Ohne Widerspruch wurde festgelegt...")

**Action Items:**
- Tabellenformat: Was | Wer | Bis wann
- Wenn "Wer" nicht aus den Notizen hervorgeht: Spalte leer lassen, nicht raten
- Wenn "Bis wann" nicht klar: "offen" statt erfundenes Datum

**Offene Punkte:**
- Was wurde angesprochen aber nicht entschieden
- Was braucht noch Klärung oder Input
- Vorschlag: Was davon sollte auf die Agenda des nächsten Termins

### 3. Gesprächsart steuert den Fokus

| Art | Schwerpunkt |
|---|---|
| Internes Meeting | Entscheidungen und Action Items, straffe Struktur |
| Kundengespräch | Kundenbedürfnisse, Vereinbarungen, nächste Schritte, Tonalität beachten |
| Workshop | Ergebnisse und Ideen dokumentieren, Cluster statt chronologisch |
| Strategiegespräch | Positionen und Richtungsentscheidungen, weniger Einzeltasks |
| 1:1 Gespräch | Kompakt, vertraulicher Ton, Fokus auf Vereinbarungen |

### 4. Qualitätsregeln

- Nichts hinzufügen was nicht in den Notizen steht — du strukturierst, du erfindest nicht
- Wenn Notizen zu dünn sind für ein Protokoll: Das sagen, nicht mit Vermutungen auffüllen
- Keine Interpretation von Stimmungen oder Meinungen die nicht explizit geäußert wurden
- Action Items ohne klaren Owner sind wertlos — lieber als "Owner unklar" kennzeichnen
