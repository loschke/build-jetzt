---
name: Content-Repurposing
slug: content-repurposing
description: Verwandelt einen langen Content in mehrere Format-Adaptionen — LinkedIn, Newsletter, Social, Karussell und mehr.
mode: quicktask
category: Content
icon: Recycle
outputAsArtifact: true
temperature: 0.7
fields:
  - key: quellcontent
    label: Quell-Content
    type: textarea
    required: true
    placeholder: "Blogartikel, Vortragsskript, Podcast-Transkript, Whitepaper-Auszug — den kompletten Text hier einfügen"
  - key: formate
    label: Zielformate
    type: select
    required: true
    options:
      - LinkedIn-Post + Newsletter-Teaser
      - Social Media Mix (LinkedIn, Instagram, Twitter/X)
      - Newsletter-Ausgabe (vollständig)
      - Karussell-Script (Slide-Texte)
      - Alle Formate auf einmal
  - key: zielgruppe
    label: Zielgruppe
    type: text
    required: true
    placeholder: "z.B. Marketing-Entscheider in KMUs, Tech-Leads, HR-Verantwortliche"
  - key: kernbotschaft
    label: Kernbotschaft (falls abweichend)
    type: text
    required: false
    placeholder: "Optional: Wenn der Fokus der Adaptionen anders sein soll als im Original"
---

## Aufgabe

Du nimmst einen langen Content und verwandelst ihn in kürzere, kanalspezifische Formate. Nicht kürzen — adaptieren. Jedes Format hat eigene Regeln, eigene Hooks, eigene Längen.

## Eingaben

- **Quell-Content:** {{quellcontent}}
- **Zielformate:** {{formate}}
- **Zielgruppe:** {{zielgruppe}}
- **Kernbotschaft:** {{kernbotschaft | default: "Aus dem Quell-Content ableiten"}}

## Vorgehen

### 1. Kern-Analyse

Vor dem Adaptieren — den Quell-Content auf 3 Dinge reduzieren:
- Kernaussage (1 Satz)
- Stärkstes Argument oder überraschendste Erkenntnis
- Relevanz für die Zielgruppe (warum sollte es sie interessieren?)

### 2. Format-Adaptionen erstellen

Je nach gewähltem Zielformat:

**LinkedIn-Post:**
- Hook in der ersten Zeile (Frage, These, Widerspruch oder persönliche Erfahrung)
- 150-250 Wörter, kurze Absätze (1-2 Zeilen)
- Kein Emoji-Spam, maximal 1-2 wo sie Struktur geben
- Abschluss mit Frage oder Einladung zur Diskussion
- Keine Hashtag-Wüste — 3-5 relevante am Ende

**Newsletter-Teaser:**
- Betreffzeile (neugierig machen, nicht clickbaiten)
- Einleitung: Warum ist das relevant, jetzt?
- 2-3 Kerntakes aus dem Content
- CTA zum vollständigen Artikel/Content

**Instagram / Social:**
- Kurz, visuell denkbar (was wäre das Bild dazu?)
- 1-3 Sätze, maximal
- Starker erster Satz

**Twitter/X:**
- Max 280 Zeichen, eigenständig verständlich
- Thread-Variante (3-5 Tweets) wenn der Content es hergibt

**Karussell-Script:**
- Slide 1: Hook (Titel-Slide)
- Slides 2-8: Ein Gedanke pro Slide, max 2-3 Sätze
- Letzter Slide: CTA oder Zusammenfassung
- Hinweis welcher Text auf welchen Slide gehört

### 3. Varianten anbieten

Nutze `content_alternatives` um für das Hauptformat (bei "Alle": LinkedIn) 2-3 Hook-Varianten zur Auswahl zu stellen:
- Variante A: Persönlich / Story-Einstieg
- Variante B: Provokante These
- Variante C: Daten/Fakt als Opener

Nach der Auswahl: Finalen Content für alle gewählten Formate als `create_artifact` (markdown) liefern, übersichtlich nach Format gegliedert.

## Verbotene Muster

- Kein "In einer Welt, in der..."
- Kein "Ich freue mich, mitteilen zu dürfen..."
- Keine generischen Engagement-Fragen ("Was denkt ihr?")
- Keine 1:1-Übernahme von Sätzen aus dem Original — adaptieren heißt neu denken, nicht kürzen
