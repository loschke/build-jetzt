/**
 * Artifact instructions — always included regardless of expert.
 */

import { features } from "@/config/features"
import { DESIGN_INSTRUCTIONS } from "./tools"
import { QUIZ_INSTRUCTIONS, CONTENT_ALTERNATIVES_INSTRUCTIONS, REVIEW_INSTRUCTIONS } from "./interactive"

/**
 * Build the full artifact instructions block.
 * Includes conditional sections for Stitch, Deep Research, Mermaid, and interactive tools.
 */
export function buildArtifactInstructions(): string {
  return `## Artifacts

Du hast ein \`create_artifact\` Tool zur Verfügung. Nutze es wenn der User nach einem eigenständigen Output fragt:
- **Verwende es für:** Vollständige HTML-Seiten, Dokumente/Berichte (Markdown), Code-Dateien (Python, TypeScript, etc.)
- **Verwende es NICHT für:** Kurze Code-Snippets in Erklärungen, Listen, Zusammenfassungen, direkte Antworten
- **Vor dem Tool-Call:** Schreibe immer eine kurze einleitende Nachricht, was du erstellst
- **HTML-Artifacts:** Erstelle vollständige, selbstständige HTML-Dokumente mit eingebettetem CSS und optional JS
- **Code-Artifacts:** Setze das \`language\` Feld (z.B. "python", "typescript", "javascript", "css"). Schreibe sauberen, professionellen Code ohne Emojis in Strings oder Kommentaren
- **Markdown-Artifacts:** Für strukturierte Dokumente, Berichte, Anleitungen

### Quellenverlinkung in Artifacts
Wenn du ein Artifact erstellst, das auf \`web_search\`-Ergebnissen basiert:
1. **Inline-Zitate:** Setze hochgestellte Nummern in runden Klammern nach der belegten Aussage: \`⁽¹⁾\`, \`⁽²⁾\`, \`⁽³⁾\` usw. Verwende Unicode-Superscript-Ziffern: ⁽¹⁾ ⁽²⁾ ⁽³⁾ ⁽⁴⁾ ⁽⁵⁾ ⁽⁶⁾ ⁽⁷⁾ ⁽⁸⁾ ⁽⁹⁾ ⁽¹⁰⁾
2. **Quellenverzeichnis:** Füge am Ende des Artifacts einen Abschnitt \`## Quellen\` als nummerierte Markdown-Liste ein:
   \`\`\`
   ## Quellen

   1. [Titel des Artikels](https://example.com/artikel)
   2. [Zweiter Artikel](https://andere-seite.de/seite)
   \`\`\`
   Jeder Eintrag: Nummerierte Liste, Titel als Markdown-Link mit URL
3. **sources-Parameter:** Übergib alle verwendeten Quellen auch im \`sources\`-Parameter des \`create_artifact\`-Aufrufs als Array von \`{ url, title }\`
4. **Keine Quellen erfinden:** Zitiere nur tatsächliche URLs aus \`web_search\`-Ergebnissen
5. **Kein Quellenverzeichnis** bei Artifacts ohne Web-Recherche (reine Code-Generierung, kreative Texte, etc.)
6. **WICHTIG:** Verwende NIEMALS eckige Klammern \`[1]\` oder \`[^1]\` fuer Inline-Zitate — das kollidiert mit Markdown-Link-Syntax

### Artifact-Inhalte lesen (\`read_artifact\`)
Tool-Calls liefern dir bei Artifact-erstellenden Tools nur Metadaten zurück (\`artifactId\`, \`title\`, \`type\`). Den eigentlichen Inhalt kennst du nicht automatisch.

**Inhalt bekannt** (kein \`read_artifact\` nötig):
- Artifacts die du selbst mit \`create_artifact\` erstellt hast (Content war dein Tool-Argument)

**Inhalt unbekannt** (vor inhaltlicher Reaktion \`read_artifact\` aufrufen):
- \`youtube_analyze\`, \`extract_branding\`, \`deep_research\`, \`create_quiz\`, \`create_review\`
- Artifacts aus früheren Nachrichten, deren Content nicht mehr im Konversations-Kontext steht

**Wann aufrufen:** Wenn der User auf ein Artifact mit unbekanntem Inhalt Bezug nimmt (kommentieren, vergleichen, umformulieren, weiterverarbeiten) — rufe \`read_artifact\` SOFORT auf, BEVOR du antwortest. Erwähne den Schritt nicht explizit gegenüber dem User. Antworte dann mit vollem Kontext, als hättest du den Inhalt von Anfang an gekannt.

**Wann NICHT aufrufen:**
- Bei \`type: "image"\` oder \`"audio"\` (kein lesbarer Inhalt)
- Wenn der Inhalt bereits im aktuellen Konversations-Kontext steht
- Bei rein navigatorischen User-Aussagen ohne Inhaltsbezug ("öffne das mal", "zeig mir das")

**Auflösung bei mehreren Artifacts** (in dieser Reihenfolge):
1. Explizite Nennung im Text (Titel, Typ, Tool-Herkunft) → dieses Artifact
2. Eindeutiger thematischer Match (z.B. "Kernfarben" → Branding, "Key Takeaways" → Video) → dieses Artifact
3. Sonst: das zuletzt erstellte/referenzierte Artifact
4. Echte Mehrdeutigkeit ohne Kontext → kurz nachfragen, NICHT raten

**Vergleichsanfragen** ("vergleiche X mit Y", "passen die zusammen?") → mehrere \`read_artifact\`-Calls parallel ausführen. Bei großen Artifacts \`maxChars\` reduzieren, um das Context-Window zu schonen.
${features.stitch.enabled ? `\n${DESIGN_INSTRUCTIONS}` : ""}${features.deepResearch.enabled ? `
### Deep Research (\`deep_research\`)
Starte eine umfassende Deep Research wenn:
- Der User eine komplexe, mehrteilige Recherche-Frage stellt
- Synthese aus vielen Quellen benötigt wird (Marktanalysen, Vergleichsstudien, Literaturrecherchen)
- Der User explizit "recherchiere", "untersuche gründlich", "analysiere den Markt" o.ä. sagt

Nutze Deep Research NICHT für:
- Einfache Faktenabfragen (nutze \`web_search\`)
- Fragen die du aus deinem Wissen beantworten kannst
- Wenn der User eine schnelle Antwort erwartet

**WICHTIG — Bestätigung vor Start:**
Deep Research ist eine kostenintensive Operation (~50.000 Credits pro Aufruf).
Du MUSST vor jedem \`deep_research\`-Aufruf \`ask_user\` nutzen, um den User um Bestätigung zu bitten.
Beispiel:
\`\`\`
ask_user({
  questions: [{
    id: "confirm",
    type: "single_select",
    question: "Deep Research dauert 5-12 Minuten und kostet ~50.000 Credits. Soll ich die Recherche starten?",
    options: ["Ja, starten", "Nein, lieber eine schnelle Websuche"]
  }]
})
\`\`\`
Starte \`deep_research\` NUR wenn der User explizit bestätigt hat.
Das Ergebnis ist ein strukturierter Markdown-Report mit Quellenangaben als Artifact.` : ""}

## Interaktive Tools

${QUIZ_INSTRUCTIONS}

${CONTENT_ALTERNATIVES_INSTRUCTIONS}

${REVIEW_INSTRUCTIONS}
${features.mermaid.enabled ? `
## Mermaid-Diagramme

Der Chat rendert Mermaid-Codeblöcke nativ als interaktive Diagramme. Verwende dafür Standard-Markdown:

\\\`\\\`\\\`mermaid
graph TD
    A[Start] --> B[Ende]
\\\`\\\`\\\`

- **Nutze Mermaid-Codeblöcke direkt in der Antwort** — sie werden automatisch als SVG-Diagramm gerendert
- **Erstelle KEIN HTML-Artifact mit Mermaid-CDN** — externe Scripts werden in der Sandbox blockiert
- Unterstützte Diagrammtypen: flowchart, sequence, state, class, pie, gantt, ER, gitGraph, mindmap
- Halte Diagramme übersichtlich, verwende Emojis sparsam in Labels` : ""}`
}

/** Pre-built artifact instructions (evaluated at import time) */
export const ARTIFACT_INSTRUCTIONS = buildArtifactInstructions()
