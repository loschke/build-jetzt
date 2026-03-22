---
name: Konkurrenzanalyse
slug: competitor-research
description: Systematische Wettbewerbsanalyse mit Recherche, Vergleich und visueller Aufbereitung als HTML-Report
---

# Konkurrenzanalyse

Du führst eine strukturierte Wettbewerbsanalyse durch. Nutze die verfügbaren Tools aktiv — recherchiere echte Daten, rate nicht.

## Schritt 1: Briefing

Nutze `ask_user` um folgende Informationen zu sammeln:

- **Branche/Produkt:** Was genau wird verglichen?
- **Eigenes Unternehmen:** Name und URL (falls vorhanden)
- **Bekannte Wettbewerber:** Welche Konkurrenten kennt der Nutzer bereits? (Freitext)

## Schritt 2: Recherche

Nutze `web_search` für jeden genannten Wettbewerber und das eigene Unternehmen:

- Positionierung und Kernbotschaft
- Pricing-Modell (falls öffentlich)
- Zielgruppe und Differenzierung
- Stärken und Schwächen aus öffentlichen Quellen

Wenn der Nutzer keine Wettbewerber nennt, recherchiere die Top 3-5 Wettbewerber in der genannten Branche.

Nutze `web_fetch` um konkrete Details von den Websites der Wettbewerber zu extrahieren: Pricing-Seiten, About-Seiten, Feature-Listen. Lies die Seiten wirklich — arbeite nicht aus dem Snippet.

## Schritt 3: Analyse

Bewerte jeden Wettbewerber nach:

| Kriterium | Beschreibung |
|---|---|
| Positionierung | Wie positionieren sie sich im Markt? |
| Pricing | Preismodell und -niveau |
| Stärken | Was machen sie besonders gut? |
| Schwächen | Wo gibt es Lücken oder Probleme? |
| Differenzierung | Was unterscheidet sie von anderen? |
| Online-Präsenz | Website-Qualität, SEO-Sichtbarkeit, Social Media |

## Schritt 4: Ergebnis als Artifact

Erstelle ein HTML-Artifact (`create_artifact` mit type `html`) mit:

1. **Header** mit Titel der Analyse und Datum
2. **Übersichtstabelle** — Alle Wettbewerber im Vergleich
3. **Stärken/Schwächen-Matrix** — Farbcodiert: grün = Stärke, rot = Schwäche, gelb = neutral
4. **Positionierungsvergleich** — Wie positioniert sich jeder Wettbewerber?
5. **Handlungsempfehlungen** — 3-5 konkrete Empfehlungen basierend auf gefundenen Lücken
6. **Quellenverzeichnis** — Links zu allen recherchierten Seiten

### Design-Vorgaben

- Dunkles, professionelles Design (dark background, helle Schrift)
- Responsiv, lesbar auf Desktop und Mobile
- Tabellen mit alternierenden Zeilenfarben
- Farbcodierung für Bewertungen
- Keine externen Dependencies, alles inline CSS
- Der Report soll direkt als PDF exportierbar sein

## Wichtig

- Recherchiere gründlich. Lieber weniger Wettbewerber mit echten Daten als viele mit Vermutungen.
- Markiere klar was recherchiert und was geschätzt ist.
- Nenne die Quellen. Jede Aussage über einen Wettbewerber sollte nachprüfbar sein.
