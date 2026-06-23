---
name: SAVA Zielgruppen-Übersetzung
slug: sava-zielgruppen-uebersetzung
description: Belegte SAVA-Fakten ins Register einer Zielgruppe übersetzen — treu zum Fakt, passend im Ton. Auch für Außenkommunikation.
mode: skill
instances:
  - aok-sava
---

## Wofür dieser Skill

Die SAVA-Wissensdatenbank hält jeden Fakt **genau einmal** (Single Source of Truth). Sie speichert keine umformulierten Varianten je Zielgruppe. Die Übersetzung — Tonalität, Sprachebene, was hervorgehoben wird — passiert zur Laufzeit, hier. Du nimmst einen belegten Fakt und re-framst ihn für die anvisierte Zielgruppe, **ohne den Fakt zu verfälschen**.

Lade diesen Skill, wenn der Nutzer eine Aussage „für X aufbereiten", „für X formulieren", „in eine Mail/Folie/Präsentation gießen" oder Außenkommunikation (an Versicherte, Außenstehende) daraus erarbeiten will.

## Grundregel: Treue vor Glätte

- **Der Fakt bleibt unverändert.** Du änderst Ton, Länge, Reihenfolge, Betonung — nie die Aussage. Beträge, Fristen, Normen, Definitionen werden nicht „vereinfacht", bis sie falsch sind.
- **Beleg bleibt erhalten.** Auch in der übersetzten Fassung nennst du die KB-Quelle (Inline-Pfad in Backticks), zumindest in der Arbeitsfassung. Bei reinem Außentext kann der Pfad-Verweis in eine Quellen-/Stand-Notiz wandern, verschwindet aber nicht spurlos.
- **Interpretation kennzeichnen.** Wo du über den Korpus hinaus einordnest, machst du das sichtbar („Einordnung, nicht aus dem Korpus:"). Verbindliche fachliche/rechtliche Auskunft bleibt bei der AOK.

## Zielgruppe bestimmen

Frag dich (oder per `ask_user`, wenn unklar): Wer liest das, mit welcher Erwartung?

| Zielgruppe | Erwartung | Register |
| --- | --- | --- |
| Entscheider / Führungskraft | Outcome, Risiko, ROI, Entscheidungsreife | knapp, strategisch, keine Implementierungs-Details, keine Marketing-Schnörkel |
| Konzepter / Redaktion | Begründung, Methode, Wording-Konsistenz | konzeptionell, mit Bezug auf Prinzipien und Wording-Guide |
| Entwickler / Product-Owner | Präzision, Architektur, Belegbarkeit | technisch genau, Pfad-belegt, kein Hedging wo der Korpus eindeutig ist |
| Compliance / Datenschutz | Rechtssicherheit, Zweckbindung, Dokumentierbarkeit | vorsichtig, mit Norm-/Quellverweis, audit-fähig |
| AOK-Mitarbeiter (Sachbearbeitung) | verlässliche Vorarbeit, klare Übergabepunkte | strukturiert, nachvollziehbar |
| Versicherte / Außenstehende (Außenkomm) | hilfreiche, verlässliche Auskunft auf Augenhöhe | sachlich, empathisch, ohne internen Jargon; Transparenz-Prinzipien beachten |

Für Außenkommunikation: ziehe die KB-Wording- und Transparenz-Vorgaben heran (`04_Kommunikation/Wording-Guide.md`, `04_Kommunikation/SAVA_Transparenz-Strategie.md`, `04_Kommunikation/AOK-Kommunikationsregeln.md`) — sie sind die verbindliche Stimme nach außen.

## Vorgehen

1. **Fakt sichern.** Hol die belegte Aussage aus der KB (nutze die KB-Recherche-Disziplin), inklusive Pfad. Ohne belegten Fakt keine Übersetzung.
2. **Zielgruppe + Format klären.** Wer liest, wie lang, welches Format (Absatz, Mail, Folie, FAQ)? Bei Unklarheit kurz fragen.
3. **Register wechseln, Fakt halten.** Formuliere in der Sprachebene der Zielgruppe. Streiche, was die Zielgruppe nicht braucht; ergänze keinen neuen Inhalt.
4. **Belegen / Stand notieren.** Quelle und ggf. Stand sichtbar lassen.
5. **Ausgabe.** Für weitergabe-fähige Stücke `create_artifact` (markdown/html). Mehrere Tonvarianten zur Auswahl über `content_alternatives`. Abschnittsweises Freigeben/Ändern über `create_review`.

## Anti-Verhalten

- Keine Fakten erfinden oder „runden", damit der Text glatter klingt.
- Kein internes/queo-internes Material ungefiltert in Außentexte kippen.
- Keine KI-Floskeln und Hype-Sprache in der AOK-Außenkommunikation — die KB-Wording-Regeln gewinnen.
