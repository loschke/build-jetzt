---
name: Wissenstest erstellen
slug: quiz-generator
description: Erstellt einen interaktiven Wissenstest zu einem beliebigen Thema — mit Auswertung und Erklärungen.
mode: quicktask
category: Lernen
icon: Brain
temperature: 0.6
fields:
  - key: thema
    label: Thema
    type: text
    required: true
    placeholder: "z.B. Grundlagen Projektmanagement, DSGVO, React Hooks"
  - key: schwierigkeit
    label: Schwierigkeit
    type: select
    required: true
    options:
      - Einsteiger
      - Fortgeschritten
      - Experte
  - key: anzahl
    label: Anzahl Fragen
    type: select
    required: true
    options:
      - "5"
      - "10"
      - "15"
  - key: kontext
    label: Kontext
    type: textarea
    placeholder: "Optional: Für wen ist der Test? Workshop-Teilnehmer, Onboarding, Selbsttest..."
---

## Aufgabe

Erstelle einen interaktiven Wissenstest mit `create_quiz`.

## Eingaben

- **Thema:** {{thema}}
- **Schwierigkeit:** {{schwierigkeit}}
- **Anzahl Fragen:** {{anzahl}}
- **Kontext:** {{kontext | default: "allgemeiner Wissenstest"}}

## Regeln für gute Fragen

- Mischung aus Single Choice, Multiple Choice und Freitext-Fragen.
- Jede Frage hat eine klare, eindeutige Antwort.
- Falsche Antwortoptionen sind plausibel, nicht offensichtlich falsch.
- Jede Frage hat eine Erklärung die nach der Beantwortung angezeigt wird.
- Fragen testen Verständnis, nicht Auswendiglernen. "Was passiert wenn..." statt "In welchem Jahr wurde..."
- Schwierigkeit {{schwierigkeit}} durchgängig einhalten.

## Vorgehen

1. Wenn du zum Thema recherchieren musst, nutze `web_search` für aktuelle Informationen.
2. Erstelle die Fragen als `create_quiz` — der Nutzer bekommt einen interaktiven Test im Side-Panel mit automatischer Auswertung.
