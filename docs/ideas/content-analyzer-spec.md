# Content Analyzer → Agent-Tools (Handoff-Spec)

> ⚠️ **ÜBERHOLT (Stand 2026-06-23).** Der hier beschriebene **Code-Weg** (3 AI-SDK-Tools mit
> `generateObject` + Zod, Registry- und `build-tools.ts`-Verdrahtung) wurde **nicht** umgesetzt.
> Stattdessen erfolgt die Umsetzung **no-code**: als Skill `geo-content-analysis`
> (`seeds/skills/geo-content-analysis.md`, `mode: skill`, Methodik + HTML-Report, `ask_user` für den
> Umfang) plus Merge der GEO-Fähigkeit in den bestehenden SEO-Experten (`seeds/experts/seo.md` →
> „SEO- & GEO-Berater"). Der Experte lädt das Gehirn via `load_skill`, scrapt URLs mit `web_fetch` und
> gibt den Report über `create_artifact(type:html)` aus.
> Hinweis: Als Quicktask (`mode: quicktask`) war der Skill für `load_skill` unsichtbar —
> `resolve-context.ts` filtert die load_skill-Liste auf `mode === "skill"`. Darum `mode: skill`.
> Dieses Dokument bleibt als fachliche Referenz für Prompts, Score-Dimensionen und Beispiele erhalten.

> **Zweck dieses Dokuments:** Den Content Analyzer aus dem Projekt `future_ux_labs` (Next.js, UI-basiert)
> als **agentische Tools** in diesen Chat-Assistenten (`build-jetzt`) portieren. Der Agent soll die
> Analyse-Abschnitte **einzeln** aufrufen oder **verketten** (= Vollanalyse) können.
>
> Dieses Dokument ist **selbst-enthaltend**: alle Prompts und Zod-Schemas stehen verbatim drin.
> Du brauchst das Quellprojekt nicht offen zu haben.

---

## 0. Schnellstart für den Kollegen (TL;DR)

Anzulegen / zu ändern sind im Kern **4 Stellen**:

1. **`src/lib/ai/tools/content-analyzer/core.ts`** — geteilte Bausteine: Zod-Schemas, Prompts,
   `truncateContent()`, `parseJsonSafely()`, Input-Resolver (URL → `webScrape`, sonst Text), die
   drei `run*`-Funktionen (`generateObject`-Aufrufe).
2. **`src/lib/ai/tools/content-analyzer/{strategy-analysis,operative-suggestions,gap-analysis}.ts`**
   — je ein `tool(...)` + `registration` (Pattern wie `src/lib/ai/tools/web-search.ts`).
3. **`src/lib/ai/tools/registry.ts`** — die drei `registration`-Objekte zu den `builtins` hinzufügen.
4. **`src/app/api/chat/build-tools.ts`** — die drei Tools in das `tools`-Objekt einhängen
   (ggf. feature-gated). Optional: System-Prompt-Hinweis in `src/config/prompts/tools.ts`.

**Bestätigte Design-Entscheidungen:**
- **3 einzelne Tools**, der Agent verkettet sie selbst für die Vollanalyse (kein Orchestrator-Tool).
- **Input = URL ODER eingefügter Text/Markdown.** Bei URL: vorhandenes Firecrawl (`webScrape`) nutzen.
- **Output = strukturiertes JSON** (validiert via Zod). Der Agent fasst im Chat zusammen — **kein**
  Artifact, **keine** Rich-UI nötig.
- **Modell:** Default `claude-sonnet-4-6`, aber über die build-jetzt Modell-Registry/Provider beziehen
  (nicht hardcoden).

Alles schon vorhanden in build-jetzt, **keine neuen Packages**: `ai`, `@ai-sdk/anthropic`, `zod`,
`@mendable/firecrawl-js`. Env vorhanden: `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`.

---

## 1. Überblick & Ziel

Der Content Analyzer bewertet und verbessert die **KI-Tauglichkeit** von Web-Content — also wie gut
ein Text von AI Overviews, ChatGPT Search und Perplexity zitiert/verstanden wird. Er besteht aus
drei aufeinander aufbauenden Analyse-Schritten:

| # | Schritt | Was es liefert |
| - | --- | --- |
| 1 | **Strategic Analysis** | Scores (0–10) auf 4 Dimensionen, Stärken, kritische Probleme, Handlungsempfehlungen, Content-Lücken |
| 2 | **Operative Suggestions** | Konkrete Before/After-Textverbesserungen (Quick Wins) |
| 3 | **Content Gaps** | Strategische Erweiterung: FAQ, Überschriften-als-Fragen, verwandte Themen, Content-Cluster |

**Datenfluss (agentisch):**

```
Input (URL oder Text)
        │  (URL → webScrape; Text → direkt)
        ▼
  [Tool 1] content_strategy_analysis  ──► StrategyAnalysis (JSON)
        │  liefert Context (overallScore, criticalIssues, contentGaps, high-prio recommendations)
        ├──────────────► [Tool 2] content_operative_suggestions ──► OperativeSuggestions (JSON)
        └──────────────► [Tool 3] content_gap_analysis          ──► ContentGaps (JSON)
```

Tool 2 und Tool 3 sind **unabhängig** voneinander, brauchen aber je den Strategy-Context. Der Agent
kann jedes Tool einzeln aufrufen oder für die „Vollanalyse" 1 → (2 + 3) verketten.

---

## 2. Die 4 KI-Content-Prinzipien (fachlicher Kern)

Diese vier Prinzipien sind die gemeinsame fachliche Grundlage aller drei Tools — sie tauchen in den
Prompts und Score-Dimensionen wieder auf:

1. **Antwort-First-Prinzip** — Wichtigste Information in den ersten 30–50 Wörtern.
2. **Struktur als Zitierstrategie** — Klare Hierarchien (`#` `##` `###`), FAQ-Elemente, Tabellen, Listen.
3. **Explizite Autorität** — Faktische Belege statt Marketing-Aussagen, konkrete Zahlen/Daten.
4. **KI-Context** — Definitionen, strukturierte Daten, zitierbare Einzelaussagen.

---

## 3. Die 3 Tools im Detail

| Tool (vorgeschlagener Name) | Quelle-Funktion | Temp | Braucht Context | Schema |
| --- | --- | --- | --- | --- |
| `content_strategy_analysis` | `lib/ai.ts` → `analyzeContentStrategy()` | **0.3** | – | `StrategyAnalysisSchema` |
| `content_operative_suggestions` | `lib/ai.ts` → `generateOperativeSuggestions()` | **0.4** | Strategy | `OperativeSuggestionsRawSchema` → `OperativeSuggestionsSchema` |
| `content_gap_analysis` | **`lib/ai-fix.ts` → `generateContentGapsFixed()`** | **0.5** | Strategy | `ContentGapsRawSchema` → `ContentGapsSchema` |

### 3.1 Temperatur-Logik
- **0.3** Strategy → konsistente, reproduzierbare Bewertungen.
- **0.4** Suggestions → etwas kreativere Umformulierungen.
- **0.5** Gaps → mehr Kreativität für strategische Ideen.

### 3.2 Abhängigkeit / Context-Übergabe (Quell-Code-belegt)

Tool 2 & 3 brauchen Context aus der Strategy-Analyse. **Tatsächlich konsumiert** werden nur wenige Felder:

- **Operative Suggestions** nutzt: `overallScore`, `criticalIssues` (mit `, ` gejoint),
  `recommendations` gefiltert auf `priority === 'high'` → deren `action` (gejoint).
- **Content Gaps** nutzt: `overallScore` + `contentGaps` (gejoint). Plus `MAIN_TOPIC`, das **nicht**
  aus der Strategy stammt, sondern per Regex `/^#\s+(.+)/m` aus dem Content (erste H1) gezogen wird.

**Empfehlung für die Tool-Signatur:** Ein optionaler, kompakter Parameter `strategyContext`:

```ts
strategyContext?: {
  overallScore: number
  criticalIssues?: string[]
  contentGaps?: string[]
  highPriorityActions?: string[]   // bereits gefiltert: recommendations[priority=high].action
}
```

- Übergibt der Agent diesen Context → direkt verwenden.
- Fehlt er → **Self-Contained-Fallback:** das Tool fährt intern zuerst die Strategy-Analyse und
  leitet den Context daraus ab. So bleibt jedes Tool eigenständig aufrufbar.

> **⚠️ Wichtig zur Content-Gaps-Quelle:** Die produktive Route `app/api/content-gaps/route.ts`
> importiert **nicht** `generateContentGaps` aus `lib/ai.ts`, sondern **`generateContentGapsFixed`
> aus `lib/ai-fix.ts`**. Das ist die kanonische Variante. Sie nutzt das flexible
> `ContentGapsRawSchema` (Felder als `array | string`) plus `parseJsonSafely` und hat eine
> **zusätzliche Prompt-Schlusszeile**. Grund für die `-fix`-Datei: das LLM gibt sporadisch
> JSON-**Strings** statt Arrays zurück; das Raw-Schema + Parser fangen das ab. → Im Anhang ist die
> Fix-Version verbatim. Nimm diese, nicht die `ai.ts`-Variante.

---

## 4. Gemeinsame Bausteine (`core.ts`)

### 4.1 `truncateContent()` — Content auf 8000 Zeichen begrenzen
Verbatim übernehmen (schneidet am letzten vollständigen Absatz ab):

```ts
const MAX_CONTENT_LENGTH = 8000

export function truncateContent(content: string): string {
  if (content.length <= MAX_CONTENT_LENGTH) return content
  const truncated = content.substring(0, MAX_CONTENT_LENGTH)
  const lastParagraph = truncated.lastIndexOf('\n\n')
  return truncated.substring(0, lastParagraph > 0 ? lastParagraph : MAX_CONTENT_LENGTH)
}
```

### 4.2 Input-Resolver — URL oder Text
Neu für build-jetzt (ersetzt die URL-only-Logik der Quelle). Nutzt das **vorhandene** Firecrawl-Wrapper:

```ts
import { webScrape } from "@/lib/web"   // vorhanden in build-jetzt

function looksLikeUrl(input: string): boolean {
  try { new URL(input.trim()); return /^https?:\/\//i.test(input.trim()) }
  catch { return false }
}

/** Liefert analysierbaren Markdown-Content, egal ob URL oder Text reinkommt. */
async function resolveContent(input: string): Promise<string> {
  if (looksLikeUrl(input)) {
    const scraped = await webScrape(input.trim(), ["markdown"])  // Signatur an build-jetzt anpassen
    const md = scraped?.markdown ?? ""
    if (md.trim().length < 100) throw new Error("Gescrapter Content zu kurz oder leer")
    return md
  }
  return input
}
```

> Die Quelle (`future_ux_labs/lib/firecrawl.ts`) erwartete diese Form als `ScrapedContent`
> (`{ url, markdown, html, metadata{title,description,language,statusCode,sourceURL}, extractedAt }`).
> In build-jetzt **nicht** nachbauen — `src/lib/web/index.ts` (`webScrape`) deckt das ab. Signatur
> dort prüfen und `resolveContent` daran anpassen.

### 4.3 `parseJsonSafely()` — robustes Parsing (für Suggestions & Gaps)
Das LLM gibt trotz Schema gelegentlich JSON-**Strings** statt Arrays zurück. Beide betroffenen Tools
nutzen Raw-Schemas (`union([array, string])`) und dann diesen Parser. Verbatim aus der Quelle:

```ts
function parseJsonSafely<T>(jsonString: string, fallback: T[] = []): T[] {
  try {
    let cleaned = jsonString.trim()
    cleaned = cleaned.replace(/^[^[\{]*/, '')                 // führende Nicht-JSON-Zeichen
    cleaned = cleaned.replace(/[^\]\}]*$/, '')                // trailing Nicht-JSON-Zeichen
    cleaned = cleaned.replace(/,\s*([\]\}])/g, '$1')          // trailing commas
    cleaned = cleaned.replace(/,\s*$/, '')
    cleaned = cleaned.replace(/([^\\])\\([^\\nrtbf"'/])/g, '$1\\\\$2') // escape backslashes
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    try {
      const basicMatch = jsonString.match(/\{[^}]*\}/g)
      if (basicMatch && basicMatch.length > 0) {
        return basicMatch.slice(0, 3).map(m => {
          try { return JSON.parse(m) } catch { return null }
        }).filter(Boolean) as T[]
      }
    } catch { /* ignore */ }
    return fallback
  }
}
```

> (In der Quelle gibt der innere Fallback Platzhalter-Objekte zurück — für build-jetzt reicht
> `.filter(Boolean)`. Bei Bedarf das Quell-Verhalten 1:1 übernehmen, siehe Anhang.)

### 4.4 Modell & Fehlerbehandlung
- Modell über build-jetzt-Provider/Registry beziehen; Default-ID `claude-sonnet-4-6`. **Nicht** wie in
  der Quelle `anthropic('claude-sonnet-4-6')` hardcoden, sondern an `model-resolver` / `config/models.ts` koppeln.
- Guards: fehlender `ANTHROPIC_API_KEY` (bzw. `FIRECRAWL_API_KEY` bei URL-Input), Mindest-Content-Länge
  (Quelle: 50 Zeichen für Analyse), leere Resultate → klare Fehlermeldung an den Agent.

---

## 5. Tool-Implementierungs-Pattern (build-jetzt-Stil)

Vorlage ist `src/lib/ai/tools/web-search.ts`: `tool({ description, inputSchema, execute })` + ein
`registration: ToolRegistration`. Beispiel für Tool 1:

```ts
// src/lib/ai/tools/content-analyzer/strategy-analysis.ts
import { tool } from "ai"
import { z } from "zod"
import type { ToolRegistration } from "../registry"
import { runStrategyAnalysis } from "./core"

export const contentStrategyAnalysisTool = tool({
  description:
    "Bewertet Web-Content auf KI-Tauglichkeit (AI Overviews, ChatGPT Search, Perplexity) anhand von " +
    "4 Prinzipien. Liefert Scores 0–10, Stärken, kritische Probleme, Handlungsempfehlungen und " +
    "Content-Lücken. Input: eine URL ODER direkt eingefügter Markdown/Text. Erster Schritt der " +
    "Content-Analyse; dessen Ergebnis ist Context für operative Suggestions und Gap-Analyse.",
  inputSchema: z.object({
    input: z.string().min(1).describe("URL der zu analysierenden Seite ODER der Content-Text/Markdown direkt"),
  }),
  execute: async ({ input }) => {
    return await runStrategyAnalysis(input)  // gibt validiertes StrategyAnalysis-JSON zurück
  },
})

export const registration: ToolRegistration = {
  name: "content_strategy_analysis",
  label: "Content-Analyse",
  icon: "Gauge",          // Lucide-Icon, frei wählbar
  category: "analysis",   // an vorhandene Kategorien anpassen
  customRenderer: false,
}
```

Tool 2 & 3 analog, zusätzlich mit optionalem `strategyContext` im `inputSchema`:

```ts
inputSchema: z.object({
  input: z.string().min(1).describe("URL ODER Content-Text/Markdown"),
  strategyContext: z.object({
    overallScore: z.number(),
    criticalIssues: z.array(z.string()).optional(),
    contentGaps: z.array(z.string()).optional(),
    highPriorityActions: z.array(z.string()).optional(),
  }).optional().describe("Ergebnis-Context aus content_strategy_analysis. Fehlt er, analysiert das Tool zuerst selbst."),
}),
```

**Registrierung:**
- `src/lib/ai/tools/registry.ts` → die drei `registration`-Objekte zu den `builtins` hinzufügen.
- `src/app/api/chat/build-tools.ts` → einhängen, z. B.:
  ```ts
  tools.content_strategy_analysis = contentStrategyAnalysisTool
  tools.content_operative_suggestions = contentOperativeSuggestionsTool
  tools.content_gap_analysis = contentGapAnalysisTool
  ```
  (Falls es einen Feature-Flag-Mechanismus gibt — analog `features.search.enabled` — gleich gaten.)

**Empfohlene Dateistruktur:**
```
src/lib/ai/tools/content-analyzer/
├── core.ts                  # Schemas, Prompts, truncateContent, parseJsonSafely, resolveContent, run*-Funktionen
├── strategy-analysis.ts     # Tool 1
├── operative-suggestions.ts # Tool 2
└── gap-analysis.ts          # Tool 3
```

### 5.1 Skizze der `run*`-Funktionen in `core.ts`

```ts
import { generateObject } from "ai"
import { resolveModel } from "@/lib/ai/model-resolver"   // an build-jetzt anpassen

const MODEL_ID = "claude-sonnet-4-6"

export async function runStrategyAnalysis(input: string): Promise<StrategyAnalysis> {
  const content = truncateContent(await resolveContent(input))
  const prompt = STRATEGIC_ANALYSIS_PROMPT.replace("{CONTENT}", content)
  const { object } = await generateObject({
    model: resolveModel(MODEL_ID),
    prompt,
    schema: StrategyAnalysisSchema,
    temperature: 0.3,
  })
  return object
}

export async function runOperativeSuggestions(input: string, ctx?: StrategyContext): Promise<OperativeSuggestions> {
  const raw = await resolveContent(input)
  const content = truncateContent(raw)
  const context = ctx ?? deriveContext(await runStrategyAnalysis(raw))  // Self-Contained-Fallback
  const prompt = OPERATIVE_SUGGESTIONS_PROMPT
    .replace("{OVERALL_SCORE}", String(context.overallScore))
    .replace("{CRITICAL_ISSUES}", (context.criticalIssues ?? []).join(", "))
    .replace("{HIGH_PRIORITY_RECOMMENDATIONS}", (context.highPriorityActions ?? []).join(", "))
    .replace("{CONTENT}", content)
  const { object } = await generateObject({
    model: resolveModel(MODEL_ID), prompt, schema: OperativeSuggestionsRawSchema, temperature: 0.4,
  })
  // Raw → normalisiert: quickWins/allSuggestions können Strings sein → parseJsonSafely
  return normalizeOperative(object)
}

export async function runGapAnalysis(input: string, ctx?: StrategyContext): Promise<ContentGaps> {
  const raw = await resolveContent(input)
  const content = truncateContent(raw)
  const context = ctx ?? deriveContext(await runStrategyAnalysis(raw))
  const mainTopic = raw.match(/^#\s+(.+)/m)?.[1] ?? "Unbekanntes Thema"
  const prompt = CONTENT_GAPS_PROMPT
    .replace("{OVERALL_SCORE}", String(context.overallScore))
    .replace("{CONTENT_GAPS}", (context.contentGaps ?? []).join(", "))
    .replace("{MAIN_TOPIC}", mainTopic)
    .replace("{CONTENT}", content)
  const { object } = await generateObject({
    model: resolveModel(MODEL_ID), prompt, schema: ContentGapsRawSchema, temperature: 0.5,
  })
  return normalizeGaps(object)   // Raw → normalisiert via parseJsonSafely (siehe Anhang)
}
```

`deriveContext(s)` mappt eine volle `StrategyAnalysis` auf den schlanken `StrategyContext`:
`overallScore`, `criticalIssues`, `contentGaps`, und `highPriorityActions = recommendations.filter(r => r.priority==='high').map(r => r.action)`.

---

## 6. Verkettung zur Vollanalyse (agentisch)

**Kein** Orchestrator-Tool. Stattdessen einen kurzen Hinweis in den System-Prompt-Tool-Instruktionen
(`src/config/prompts/tools.ts`, eingebunden über `src/config/prompts/index.ts`):

> Wenn der Nutzer eine **vollständige Content-Analyse** möchte: Rufe zuerst `content_strategy_analysis`
> auf. Reiche dessen Ergebnis als `strategyContext` an `content_operative_suggestions` **und**
> `content_gap_analysis` weiter. Für eine Teil-Analyse genügt der jeweilige Einzel-Aufruf — fehlt der
> Context, ermittelt das Tool ihn selbst. Fasse die JSON-Ergebnisse für den Nutzer lesbar zusammen
> (Scores, wichtigste Quick Wins, Top-Empfehlungen), statt rohes JSON auszugeben.

---

## 7. Env / Abhängigkeiten

Bereits in build-jetzt vorhanden — **keine neuen Packages**:

| Bedarf | Status in build-jetzt |
| --- | --- |
| `ai` (`generateObject`, `tool`) | ✅ vorhanden |
| `@ai-sdk/anthropic` / Provider | ✅ vorhanden |
| `zod` (v4) | ✅ vorhanden |
| `@mendable/firecrawl-js` via `src/lib/web` | ✅ vorhanden (`webScrape`) |
| `ANTHROPIC_API_KEY` | ✅ vorhanden |
| `FIRECRAWL_API_KEY` (nur für URL-Input) | ✅ vorhanden |

---

## 8. Anhang — Verbatim-Prompts & Schemas

> Strategy + Suggestions stammen aus `future_ux_labs/lib/ai.ts`.
> **Content-Gaps stammt aus `future_ux_labs/lib/ai-fix.ts`** (kanonische, produktive Variante).
> Sprache der Prompts: Deutsch. Nicht übersetzen.

### 8.1 `StrategyAnalysisSchema` (Tool 1)

```ts
export const StrategyAnalysisSchema = z.object({
  scores: z.object({
    answerFirst: z.number().min(0).max(10).describe("Antwort-First-Prinzip: Steht wichtigste Info in ersten 50 Wörtern?"),
    structuralClarity: z.number().min(0).max(10).describe("Strukturelle Klarheit: Überschriften, Listen, Tabellen erkennbar?"),
    factualDensity: z.number().min(0).max(10).describe("Faktendichte: Konkrete Zahlen/Daten statt Marketing-Aussagen?"),
    citability: z.number().min(0).max(10).describe("Zitierfähigkeit: Einzelaussagen ohne Kontext verständlich?")
  }),
  overallScore: z.number().min(0).max(10).describe("Gesamtbewertung der KI-Tauglichkeit"),
  strengths: z.array(z.string()).describe("Was funktioniert bereits gut (max 3 Punkte)"),
  criticalIssues: z.array(z.string()).describe("Schwerwiegende Probleme die sofort behoben werden müssen"),
  recommendations: z.array(z.object({
    category: z.enum(["structure", "content", "authority", "context"]),
    priority: z.enum(["high", "medium", "low"]),
    action: z.string().describe("Konkrete Handlungsempfehlung"),
    impact: z.string().describe("Erwartete Verbesserung")
  })),
  contentGaps: z.array(z.string()).describe("Welche wichtigen Informationen fehlen komplett?"),
  reasoning: z.string().describe("Kurze Begründung der Gesamtbewertung mit Verweis auf Hauptprobleme")
})
export type StrategyAnalysis = z.infer<typeof StrategyAnalysisSchema>
```

### 8.2 `STRATEGIC_ANALYSIS_PROMPT` (Tool 1, temp 0.3)

Platzhalter: `{CONTENT}`.

```text
Du bist ein Expert für Content-Optimierung in der KI-Ära. Analysiere den folgenden Markdown-Content gegen die neuen KI-Content-Prinzipien und bewerte seine Tauglichkeit für AI Overviews, ChatGPT Search und Perplexity.

## Die 4 KI-Content-Prinzipien:

1. **Antwort-First-Prinzip**: Wichtigste Information in den ersten 30-50 Wörtern
2. **Struktur als Zitierstrategie**: Klare Hierarchien (# ## ###), FAQ-Elemente, Tabellen, Listen
3. **Explizite Autorität**: Faktische Belege statt Marketing-Aussagen, konkrete Zahlen/Daten
4. **KI-Context**: Definitionen, strukturierte Daten, zitierbare Einzelaussagen

## Bewertungsskala (0-10):
- 0-2: Völlig ungeeignet für KI-Systeme
- 3-4: Große Probleme, umfassende Überarbeitung nötig
- 5-6: Mittelmäßig, deutliche Verbesserungen möglich
- 7-8: Gut, kleinere Optimierungen sinnvoll
- 9-10: Exzellent, KI-ready

## Zu analysierender Content:
```markdown
{CONTENT}
```

Analysiere systematisch und gib konkrete, umsetzbare Handlungsempfehlungen.
```

### 8.3 Operative-Suggestions Schemas (Tool 2)

```ts
export const OperativeSuggestionSchema = z.object({
  originalText: z.string().describe("Ursprünglicher Text der verbessert werden soll"),
  improvedText: z.string().describe("Konkrete Verbesserung des Textes"),
  category: z.enum(["MISSING", "REWRITE", "STRUCTURE", "CONTEXT"]).describe("Verbesserungskategorie"),
  priority: z.enum(["high", "medium", "low"]).describe("Umsetzungspriorität"),
  reasoning: z.string().describe("Warum diese Änderung die KI-Tauglichkeit verbessert"),
  section: z.string().describe("In welchem Abschnitt des Contents (für bessere Orientierung)")
})

// Flexibles Schema für LLM-Response (manchmal Strings statt Arrays)
export const OperativeSuggestionsRawSchema = z.object({
  quickWins: z.union([z.array(OperativeSuggestionSchema), z.string()]).describe("Die 3-5 wichtigsten Verbesserungen"),
  allSuggestions: z.union([z.array(OperativeSuggestionSchema), z.string()]).describe("Alle Verbesserungsvorschläge"),
  transformationSummary: z.string().describe("Was würde sich durch alle Änderungen insgesamt verbessern?")
})

// Normalisiertes Zielschema
export const OperativeSuggestionsSchema = z.object({
  quickWins: z.array(OperativeSuggestionSchema).max(5).describe("Die 3-5 wichtigsten Verbesserungen mit größtem Impact"),
  allSuggestions: z.array(OperativeSuggestionSchema).describe("Alle identifizierten Verbesserungsmöglichkeiten"),
  transformationSummary: z.string().describe("Was würde sich durch alle Änderungen insgesamt verbessern?")
})
export type OperativeSuggestion = z.infer<typeof OperativeSuggestionSchema>
export type OperativeSuggestions = z.infer<typeof OperativeSuggestionsSchema>
```

**Normalisierung `normalizeOperative(raw)`** (Quelle `lib/ai.ts`): `quickWins`/`allSuggestions` ggf.
per `parseJsonSafely` aus String parsen, sonst Array übernehmen (Default `[]`);
`transformationSummary ?? 'Keine Zusammenfassung verfügbar.'`. Wirf einen Fehler, wenn **beide**
Listen leer sind ("Keine gültigen Verbesserungsvorschläge generiert").

### 8.4 `OPERATIVE_SUGGESTIONS_PROMPT` (Tool 2, temp 0.4)

Platzhalter: `{OVERALL_SCORE}`, `{CRITICAL_ISSUES}`, `{HIGH_PRIORITY_RECOMMENDATIONS}`, `{CONTENT}`.

```text
Du bist ein Content-Redakteur und hilfst dabei, Content für KI-Systeme zu optimieren.

## Context aus der Strategic Analysis:
- Gesamtscore: {OVERALL_SCORE}/10
- Hauptprobleme: {CRITICAL_ISSUES}
- Prioritäre Verbesserungen: {HIGH_PRIORITY_RECOMMENDATIONS}

## Aufgabe:
Analysiere den Content und gib konkrete Before/After Verbesserungsvorschläge für die wichtigsten Problemstellen.

### Kategorien:
- **MISSING**: Wichtige Informationen fehlen (Preise, Zahlen, Fakten)
- **REWRITE**: Marketing-Sprache → klare Aussagen umformulieren
- **STRUCTURE**: Überschriften, Absätze, Listen optimieren
- **CONTEXT**: Fachbegriffe definieren, Kontext hinzufügen

### Prioritäten:
- **high**: Blockiert KI-Zitierfähigkeit komplett
- **medium**: Deutliche Verbesserung möglich
- **low**: Nice-to-have Optimierung

## Beispiele guter Transformationen:

**MISSING - Preise:**
❌ "Kostengünstige Lösung"
✅ "Ab 49€ pro Nutzer monatlich"

**REWRITE - Marketing → Fakten:**
❌ "Innovative CRM-Software revolutioniert Kundenbeziehungen"
✅ "CRM-Software mit Lead-Scoring, Pipeline-Management und E-Mail-Automation"

**STRUCTURE - Antwort-First:**
❌ "In der heutigen digitalen Welt... Nach umfangreicher Analyse... Die Lösung kostet 200€"
✅ "Die Software kostet 200€ pro Monat. In der digitalen Transformation..."

**CONTEXT - Definitionen:**
❌ "Unsere API-Integration"
✅ "API-Integration (automatischer Datenaustausch zwischen verschiedenen Software-Systemen)"

## Content zu analysieren:
```markdown
{CONTENT}
```

Extrahiere die wichtigsten Problemstellen und gib konkrete Before/After Verbesserungen.
Konzentriere dich auf 5-10 hochwertige Verbesserungen statt auf jede kleine Änderung.

WICHTIG: Gib quickWins und allSuggestions als direkte JSON-Arrays zurück, NICHT als JSON-Strings!
```

### 8.5 Content-Gaps Schemas (Tool 3) — aus `lib/ai-fix.ts`

```ts
export const FAQSuggestionSchema = z.object({
  question: z.string().describe("Konkrete Frage die User stellen könnten"),
  suggestedAnswer: z.string().describe("Strukturierte Antwort mit wichtigsten Fakten"),
  searchIntent: z.enum(["informational", "navigational", "transactional"]).describe("Art der Suchanfrage"),
  priority: z.enum(["high", "medium", "low"]).describe("Wichtigkeit für Voice Search")
})

export const HeadingOptimizationSchema = z.object({
  currentHeading: z.string().describe("Aktuelle Überschrift"),
  optimizedHeading: z.string().describe("Als Frage formulierte Überschrift"),
  reasoning: z.string().describe("Warum diese Formulierung besser für Voice Search ist"),
  searchVolume: z.enum(["high", "medium", "low"]).describe("Geschätztes Suchvolumen")
})

export const RelatedTopicSchema = z.object({
  topic: z.string().describe("Verwandtes Thema für zusätzlichen Content"),
  contentType: z.enum(["article", "faq", "guide", "comparison", "tutorial"]).describe("Empfohlener Content-Typ"),
  priority: z.enum(["high", "medium", "low"]).describe("Umsetzungspriorität"),
  reasoning: z.string().describe("Warum dieses Thema den Content-Cluster stärkt"),
  keywordOpportunity: z.string().describe("Haupt-Keyword-Chance")
})

export const ContentClusterSchema = z.object({
  clusterTopic: z.string().describe("Übergeordnetes Cluster-Thema"),
  suggestedArticles: z.array(z.string()).describe("Liste konkreter Artikel-Ideen"),
  linkingStrategy: z.string().describe("Wie die Artikel intern verlinkt werden sollten"),
  topicalAuthority: z.string().describe("Wie dieser Cluster die Themen-Autorität stärkt")
})

// Flexibles Schema (behandelt sowohl Arrays als auch JSON-Strings)
export const ContentGapsRawSchema = z.object({
  faqSuggestions: z.union([z.array(FAQSuggestionSchema), z.string()]).describe("Konkrete FAQ-Vorschläge"),
  headingOptimizations: z.union([z.array(HeadingOptimizationSchema), z.string()]).describe("Überschriften als Fragen formuliert"),
  relatedTopics: z.union([z.array(RelatedTopicSchema), z.string()]).describe("Verwandte Themen für Content-Erweiterung"),
  contentClusters: z.union([z.array(ContentClusterSchema), z.string()]).describe("Content-Cluster Strategien"),
  overallStrategy: z.string().describe("Zusammenfassung der Content-Strategie-Empfehlungen")
})

// Normalisiertes Zielschema
export const ContentGapsSchema = z.object({
  faqSuggestions: z.array(FAQSuggestionSchema).max(8).describe("Konkrete FAQ-Vorschläge"),
  headingOptimizations: z.array(HeadingOptimizationSchema).max(6).describe("Überschriften als Fragen formuliert"),
  relatedTopics: z.array(RelatedTopicSchema).max(10).describe("Verwandte Themen für Content-Erweiterung"),
  contentClusters: z.array(ContentClusterSchema).max(3).describe("Content-Cluster Strategien"),
  overallStrategy: z.string().describe("Zusammenfassung der Content-Strategie-Empfehlungen")
})
export type ContentGaps = z.infer<typeof ContentGapsSchema>

// Schlanker Context, den die Gap-Funktion tatsächlich konsumiert:
export type StrategyContext = {
  scores?: { answerFirst: number; structuralClarity: number; factualDensity: number; citability: number }
  overallScore: number
  contentGaps?: string[]
  criticalIssues?: string[]
  highPriorityActions?: string[]
}
```

**Normalisierung `normalizeGaps(raw)`** (Quelle `lib/ai-fix.ts`): für jedes der vier Array-Felder gilt
`typeof feld === 'string' ? parseJsonSafely(feld, []) : (feld ?? [])`;
`overallStrategy ?? 'Keine Strategie verfügbar.'`.

### 8.6 `CONTENT_GAPS_PROMPT` (Tool 3, temp 0.5) — aus `lib/ai-fix.ts`

Platzhalter: `{OVERALL_SCORE}`, `{CONTENT_GAPS}`, `{MAIN_TOPIC}`, `{CONTENT}`.
**Beachte die zusätzliche Schlusszeile** (im Vergleich zur `ai.ts`-Variante):

```text
Du bist ein SEO- und Content-Strategie-Experte, spezialisiert auf Voice Search und Topical Authority. Analysiere den Content für strategische Erweiterungsmöglichkeiten.

## Context aus der Strategic Analysis:
- Gesamtscore: {OVERALL_SCORE}/10
- Identifizierte Content-Lücken: {CONTENT_GAPS}
- Hauptthema: {MAIN_TOPIC}

## Aufgabe:
Entwickle eine umfassende Content-Erweiterungs-Strategie mit 4 Fokus-Bereichen:

### 1. FAQ-Empfehlungen
Analysiere typische User-Fragen zu diesem Thema:
- Voice Search optimierte Fragen ("Wie...", "Was ist...", "Warum...")
- Informational, navigational, transactional Intent
- Konkrete Antwort-Strukturen mit Fakten

### 2. Überschriften-Optimierung
Wandle existierende Überschriften in Fragen um:
- Orientierung an natürlichsprachigen Suchanfragen
- High-Volume Keywords berücksichtigen
- Voice Search freundliche Formulierungen

### 3. Verwandte Themen
Identifiziere Content-Opportunities:
- Thematisch verwandte Artikel-Ideen
- Different Content-Typen (Guides, Comparisons, Tutorials)
- Keyword-Opportunities für Content-Cluster

### 4. Content-Cluster-Strategie
Entwickle Topical Authority:
- Übergeordnete Themen-Cluster
- Interne Verlinkungsstrategien
- Hub-and-Spoke Content-Architektur

## Content zu analysieren:
```markdown
{CONTENT}
```

WICHTIG: Gib alle Felder als echte JSON-Objekte/Arrays zurück, NICHT als JSON-Strings! Das Schema erwartet direkte Objekte.

Gib konkrete, umsetzbare Empfehlungen die den Content strategisch erweitern und die Topical Authority stärken.
```

---

## 9. Verifikation (für den Kollegen nach der Umsetzung)

1. **Einzeltest pro Tool** im Chat:
   - `content_strategy_analysis` mit einer URL → erwartet `scores` (4 Dim.), `overallScore`,
     `strengths`, `criticalIssues`, `recommendations`, `contentGaps`, `reasoning`.
   - `content_strategy_analysis` mit **eingefügtem Text** statt URL → gleiche Struktur (prüft Input-Resolver).
   - `content_operative_suggestions` **ohne** `strategyContext` → Self-Contained-Fallback greift.
   - `content_gap_analysis` **mit** `strategyContext` → nutzt übergebenen Context (kein Doppel-Call).
2. **Verkettung**: Nutzer bittet um „vollständige Analyse" → Agent ruft 1, dann 2 + 3 mit
   weitergereichtem Context, fasst lesbar zusammen.
3. **Robustheit**: Test mit einer Seite, bei der das LLM gerne Strings liefert → `parseJsonSafely`
   verhindert Crashes (Felder bleiben Arrays).
4. **Guards**: leerer/zu kurzer Content (<50 Zeichen) und fehlende API-Keys → saubere Fehlermeldung.
5. `tsc`/Lint grün; die drei Tools erscheinen in der Registry und sind im Chat aufrufbar.
```
