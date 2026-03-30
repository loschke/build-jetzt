/**
 * Session Wrap-up: Typ-Definitionen, Labels und Prompt-Templates.
 * Generiert strukturierte Markdown-Artifacts aus Chat-Sessions.
 */

export interface WrapupType {
  key: string
  label: string
  description: string
  icon: string
  promptTemplate: string
}

export const WRAPUP_TYPES: WrapupType[] = [
  {
    key: "summary",
    label: "Zusammenfassung",
    description: "Kernpunkte, Entscheidungen und offene Fragen kompakt",
    icon: "FileText",
    promptTemplate: `Erstelle eine kompakte Zusammenfassung des gesamten bisherigen Dialogs.

Struktur:
## Thema
Ein Satz: Worum ging es?

## Kernpunkte
- Die wichtigsten Erkenntnisse und Ergebnisse als Bullet Points

## Entscheidungen
- Getroffene Entscheidungen mit kurzer Begründung

## Offene Fragen
- Falls vorhanden: Was wurde nicht abschließend geklärt?

Halte es scannbar und auf das Wesentliche reduziert.`,
  },
  {
    key: "action-items",
    label: "Action Items",
    description: "Priorisierte nächste Schritte als Tabelle",
    icon: "ListChecks",
    promptTemplate: `Erstelle eine priorisierte Liste von Action Items basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Kontext
Ein Satz: Was wurde besprochen?

## Action Items

| # | Aufgabe | Priorität | Abhängigkeit |
|---|---------|-----------|--------------|
| 1 | ... | Hoch/Mittel/Niedrig | Falls vorhanden |

## Hinweise
- Zusätzliche Informationen die für die Umsetzung relevant sind

Leite die Action Items aus konkreten Ergebnissen und Entscheidungen im Dialog ab. Keine generischen Aufgaben erfinden.`,
  },
  {
    key: "prd",
    label: "Anforderungsdokument",
    description: "Formales Dokument mit Anforderungen und Abgrenzung",
    icon: "ClipboardList",
    promptTemplate: `Erstelle ein Anforderungsdokument (PRD) basierend auf dem gesamten bisherigen Dialog.

Struktur:
## Ziel
Was soll erreicht werden? Ein klarer Satz.

## Kontext
Warum ist das relevant? Hintergrund und Ausgangslage.

## Anforderungen

### Must-Have
- Unverzichtbare Anforderungen

### Should-Have
- Wichtige aber nicht kritische Anforderungen

### Could-Have
- Nice-to-have Features

## Abgrenzung
Was ist explizit NICHT Teil des Scopes?

## Offene Fragen
Ungeklärte Punkte die vor der Umsetzung entschieden werden müssen.`,
  },
  {
    key: "memories",
    label: "Wichtiges merken",
    description: "Relevante Infos aus der Session für zukünftige Chats speichern",
    icon: "Brain",
    promptTemplate: `Analysiere den gesamten bisherigen Dialog und identifiziere Informationen die für zukünftige Gespräche relevant wären.

Suche gezielt nach:
- Persönliche Präferenzen und Arbeitsweisen des Nutzers
- Projekt-Kontext, Entscheidungen, technische Rahmenbedingungen
- Wiederkehrende Anforderungen oder Workflows
- Fachliche Rollen, Verantwortlichkeiten, Team-Strukturen

Ignoriere:
- Triviale Fakten oder Smalltalk
- Einmalige Fragen ohne Wiederkehr-Relevanz
- Informationen die bereits im Memory gespeichert sind

Nutze das suggest_memory Tool um die Vorschläge dem User zur Auswahl zu präsentieren. Formuliere jeden Memory-Text klar, kompakt und eigenständig verständlich. Gib für jeden Vorschlag einen kurzen Grund an warum er relevant ist.`,
  },
]

export function getWrapupType(key: string): WrapupType | undefined {
  return WRAPUP_TYPES.find((t) => t.key === key)
}

export function buildWrapupPrompt(type: WrapupType, userContext?: string, format: "text" | "audio" = "text"): string {
  const sections: string[] = []

  sections.push(`## Session Wrap-up: ${type.label}`)
  sections.push("Analysiere den gesamten bisherigen Dialog sorgfältig und erstelle ein strukturiertes Dokument.")
  sections.push(type.promptTemplate)

  if (userContext?.trim()) {
    sections.push(`### Zusätzliche Hinweise des Nutzers\n${userContext.trim()}`)
  }

  if (type.key !== "memories") {
    if (format === "audio") {
      sections.push(`WICHTIG: Erstelle das Ergebnis als Audio mit dem \`text_to_speech\` Tool. Formuliere den Text als gesprochene Zusammenfassung — natürlich, flüssig, ohne Markdown-Formatierung, ohne Aufzählungszeichen oder Tabellen. Halte dich kompakt (max. 4000 Zeichen), damit die Sprachausgabe gut funktioniert. Beginne direkt mit dem Inhalt, keine Meta-Einleitung wie "Hier ist deine Zusammenfassung".`)
    } else {
      sections.push(`WICHTIG: Erstelle das Ergebnis als Artifact mit dem \`create_artifact\` Tool (type: "markdown"). Wähle einen passenden Titel im Format "${type.label}: [Thema aus der Konversation]".`)
    }
  }

  return sections.join("\n\n")
}
