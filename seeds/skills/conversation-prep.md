---
name: Gesprächsvorbereitung
slug: conversation-prep
description: Strukturierte Vorbereitung für Business-Gespräche mit Recherche, Gesprächsleitfaden und Talking Points.
mode: quicktask
category: Workflow
icon: MessageSquare
outputAsArtifact: true
temperature: 0.5
fields:
  - key: situation
    label: Gesprächssituation
    type: select
    required: true
    options:
      - Erstgespräch / Discovery Call
      - Pitch / Angebotsvorstellung
      - Follow-up nach Angebot
      - Bestandskunden-Gespräch
      - Networking / Event-Kontakt
      - Schwieriges Gespräch / Eskalation
  - key: gegenüber
    label: Gesprächspartner
    type: text
    required: true
    placeholder: "Name, Rolle, Unternehmen — z.B. Anna Müller, Head of Marketing, ACME GmbH"
  - key: ziel
    label: Was willst du erreichen?
    type: text
    required: true
    placeholder: "z.B. Folge-Termin für Angebotsvorstellung vereinbaren"
  - key: kontext
    label: Was weißt du bereits?
    type: textarea
    required: false
    placeholder: "Bisherige Kontakte, bekannte Pain Points, Branche, Budget-Situation, Verbindungen..."
---

## Aufgabe

Du bereitest ein Business-Gespräch vor. Dein Output ist ein kompakter, direkt nutzbarer Gesprächsleitfaden — kein Roman, sondern ein Spickzettel den man 5 Minuten vor dem Call überfliegen kann.

## Eingaben

- **Situation:** {{situation}}
- **Gesprächspartner:** {{gegenüber}}
- **Ziel:** {{ziel}}
- **Bekannter Kontext:** {{kontext | default: "Keine Vorinformationen"}}

## Vorgehen

### 1. Recherche

Wenn im Gesprächspartner-Feld ein Unternehmen oder eine bekannte Person genannt wird, nutze `web_search` um relevante Informationen zu sammeln:

- Unternehmen: Was machen sie, aktuelle News, Größe, Branche
- Person: Rolle, öffentliches Profil (LinkedIn, Vorträge, Artikel), gemeinsame Kontakte
- Branche: Aktuelle Trends oder Herausforderungen die relevant sein könnten

Keine Deep-Dive-Recherche — 2-3 Suchanfragen reichen. Ziel ist Gesprächsfähigkeit, nicht Dossier.

### 2. Briefing erstellen

Erstelle ein `create_artifact` (markdown) mit folgender Struktur:

**Kopf:**
- Gesprächspartner (Name, Rolle, Unternehmen)
- Situation + Ziel (je 1 Satz)
- Recherche-Highlights (3-5 Bullet Points — nur was wirklich nützlich ist)

**Gesprächsleitfaden:**

Je nach Situation unterschiedlich aufbauen:

| Situation | Schwerpunkt des Leitfadens |
|---|---|
| Erstgespräch / Discovery | Offene Fragen zum Bedarf, aktives Zuhören, Qualifizierungsfragen |
| Pitch / Angebot | Kernbotschaft, 2-3 stärkste Argumente, Demo-/Beispiel-Empfehlung |
| Follow-up | Bezug zum letzten Kontakt, offene Punkte adressieren, nächsten Schritt definieren |
| Bestandskunde | Zufriedenheit prüfen, Erweiterungspotenzial, Beziehungspflege |
| Networking / Event | Eisbrecher, gemeinsame Anknüpfungspunkte, lockerer Gesprächseinstieg |
| Schwieriges Gespräch | Sachebene halten, Verständnis zeigen, Lösungsvorschlag vorbereiten |

**Kernelemente (immer enthalten):**
- 3 Einstiegsfragen (situationsangemessen, nicht generisch)
- 3-5 Talking Points (was du ansprechen willst, in welcher Reihenfolge)
- 2-3 mögliche Einwände + wie du darauf reagieren kannst
- Klarer nächster Schritt (was ist das gewünschte Ergebnis am Ende des Gesprächs?)

**Format-Regeln:**
- Maximal 1 Seite — wenn es länger wird, kürzen
- Stichpunkte, keine Fließtexte
- Formulierungen als direkte Sprache ("Wie gehen Sie aktuell mit X um?" statt "Frage nach dem aktuellen Umgang mit X")
- Keine Floskeln wie "Schön Sie kennenzulernen" — das kann jeder selbst
