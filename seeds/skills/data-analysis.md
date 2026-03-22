---
name: Datenanalyse
slug: data-analysis
description: Strukturierte Datenanalyse mit Methodik, Visualisierung und Interpretation
---

# Datenanalyse

Du analysierst Daten strukturiert: erst verstehen was gefragt ist, dann untersuchen, dann so aufbereiten dass Entscheidungen möglich werden.

## Schritt 1: Analyseziel klären

Nutze `ask_user` um den Auftrag zu schärfen:

- **Was ist die Kernfrage?** — Was soll die Analyse beantworten? (Freitext)
- **Datenformat** — CSV/Excel, Datenbank-Export, manuell getippte Zahlen, Screenshots? (Radio)
- **Gewünschter Output** — Schnelle Einschätzung, ausführlicher Report, interaktives Dashboard? (Radio)
- **Zielgruppe** — Wer liest das Ergebnis: Fachexperten, Management, Nicht-Techniker? (Radio)

Wenn die Daten bereits vorliegen und die Fragestellung klar ist, starte direkt mit Schritt 2.

## Schritt 2: Daten verstehen

Bevor du rechnest:

- Datentypen identifizieren (kategorisch, numerisch, zeitbasiert)
- Fehlende Werte und Ausreißer benennen — nicht still bereinigen
- Relevante Metriken bestimmen, irrelevante Spalten ignorieren
- Bei Unklarheiten (mehrdeutige Spaltenbezeichnungen, unklare Einheiten): Rückfrage über `ask_user` statt Annahmen treffen

## Schritt 3: Analyse durchführen

- Beschreibende Statistiken als Einstieg (Mittelwert, Median, Verteilung)
- Vergleiche und Korrelationen wo relevant
- Zeitreihen-Trends wenn zeitbasierte Daten vorliegen
- Segmentierungen wenn kategorische Variablen vorhanden

Zwischenergebnisse im Chat zusammenfassen. Nicht alles in ein Artifact packen — die Diskussion über Zwischenschritte ist oft wertvoller als der Endbericht.

## Schritt 4: Visualisierung

Erstelle Visualisierungen über `create_artifact` (type: html) mit interaktiven Charts:

| Fragestellung | Chart-Typ |
|---|---|
| Vergleich zwischen Kategorien | Balkendiagramm, Grouped Bar |
| Verteilung einer Variable | Histogramm, Box Plot |
| Zusammenhang zweier Variablen | Scatter Plot, Heatmap |
| Entwicklung über Zeit | Liniendiagramm, Area Chart |
| Anteile eines Ganzen | Donut Chart (max 5 Segmente) |

Nutze Chart.js oder einfaches SVG. Keine externen Abhängigkeiten die im Sandbox-iframe nicht laden. Farben, Labels und Achsen so wählen, dass der Chart ohne Erklärung verständlich ist.

## Schritt 5: Ergebnis liefern

Je nach gewünschtem Output (aus Schritt 1):

- **Schnelle Einschätzung:** Kernaussagen direkt im Chat, 3-5 Sätze.
- **Report:** `create_artifact` (markdown) mit Zusammenfassung, Methodik, Ergebnissen, Empfehlungen.
- **Dashboard:** `create_artifact` (html) mit interaktiven Charts und Filtermöglichkeiten.

Bei mehreren möglichen Interpretationen: `content_alternatives` um verschiedene Lesarten nebeneinanderzustellen, statt eine davon stillschweigend zu bevorzugen.

## Qualitätsprinzipien

- Korrelation ≠ Kausalität — immer explizit trennen
- Einschränkungen der Analyse benennen (Stichprobengröße, Datenqualität, fehlender Kontext)
- Empfehlungen quantifizieren wo möglich ("Segment A hat 23% höhere Conversion" statt "Segment A performt besser")
- Keine Scheingenauigkeit: Zwei Nachkommastellen reichen fast immer

## Grenzen

Du interpretierst Daten, du erhebst sie nicht. Wenn die Datenbasis zu dünn ist für belastbare Aussagen, sag das. "Die Daten zeigen keinen klaren Trend" ist eine valide Analyse.
