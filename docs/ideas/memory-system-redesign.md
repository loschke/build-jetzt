# Memory-System Redesign: Von Auto-Extract zu User-Steered Memory

## Context

Das aktuelle Memory-System basiert auf Mem0 (Cloud-Service) und hat zwei Pfade:

1. **Auto-Extraction** (fire-and-forget nach 6+ Messages) -- Mem0's LLM entscheidet autonom was gespeichert wird
2. **Explizites `save_memory`** Tool -- AI speichert wenn User "merke dir X" sagt

**Problem:** Auto-Extraction speichert zu viel Irrelevantes. User hat keine Kontrolle darueber was gespeichert wird. Das Feature ist "semi gut" -- die Grundidee stimmt, aber die Steuerung fehlt.

**Ziel:** Memory wird primaer user-gesteuert -- entweder durch direkte Aufforderungen oder durch Zustimmung auf kuratierte Vorschlaege.

---

## Analyse: Was Mem0 kann vs. was wir brauchen

### Mem0 Capabilities (relevant)

- `infer=True/False` auf `add()` -- Auto-Extraction steuerbar
- Metadata-Tagging (beliebige Key-Values pro Memory)
- Relevance Scores (0-1) bei Search
- Deduplication/Conflict Resolution (built-in bei infer=True)
- Expiration Dates
- Self-hosted Option (Qdrant + beliebiger LLM)

### Was Mem0 NICHT hat

- Approval Workflows (keine eingebaute User-Bestaetigung)
- Quality Gates (kein Threshold-Filtering app-seitig)
- Kategorisierung (muss ueber Metadata selbst gebaut werden)

### Fazit

Mem0 ist als Storage-Layer gut. Die Intelligenz (was gespeichert wird, wann vorgeschlagen) muss in unserer App liegen.

---

## Konzept: 3-Saeulen Memory

### Saeule 1: Explizites Speichern (besteht, unveraendert)

- User sagt "Merke dir, dass ich X bevorzuge"
- AI nutzt `save_memory` Tool
- Direkt gespeichert, kein Approval noetig
- **Keine Aenderung noetig**

### Saeule 2: Memory-Vorschlaege via Session-Wrapup (NEU -- Kernfeature)

- **Neuer 4. Wrapup-Typ "Erinnerungen"** im bestehenden Session-Wrapup-Popover
- User entscheidet selbst WANN er Memory-Extraction ausloesen will (volle Kontrolle)
- Nutzt das bekannte Wrapup-Pattern: Pill-Button Auswahl → optionaler Context → Erstellen
- **Sonderverhalten:** Statt Artifact-Erstellung generiert der Wrapup-Typ ein `suggest_memory` Generative-UI-Widget
- User waehlt im Widget aus welche Vorschlaege gespeichert werden
- Context-Feld dient als **Fokus-Hint** ("Merke dir vor allem meine Design-Praeferenzen")

**UX-Flow:**

```
1. User klickt "Session abschliessen" Button
2. Popover oeffnet → 4 Typen: [Zusammenfassung] [Action Items] [PRD] [Erinnerungen]
3. User waehlt "Erinnerungen"
4. Optional: Fokus-Hint im Textfeld ("Konzentrier dich auf meine Praeferenzen")
5. Klick "Erstellen" → Message wird gesendet
6. AI analysiert Chat-Verlauf, generiert Memory-Vorschlaege
7. suggest_memory Tool wird aufgerufen → Generative UI Widget rendert
8. Pro Vorschlag: Memory-Text + Grund + [Speichern] / [Verwerfen] Buttons
9. User waehlt aus → approved Memories werden gespeichert
10. addToolResult meldet Ergebnis zurueck → AI bestaetigt kurz
```

### Saeule 3: Recall (besteht, leicht verbessert)

- `recall_memory` Tool unveraendert
- Memory-Search bei neuen Chats mit **Relevance-Threshold** (Score < 0.4 rausfiltern)
- Weniger Noise im System-Prompt

### Entfernt: Auto-Extraction

- `triggerMemoryExtraction()` wird aus `post-response.ts` entfernt
- `extractMemories()` und `toMem0Messages()` werden deprecated/entfernt
- `minMessages` Config wird nicht mehr gebraucht

---

## Detail: Wrapup-Typ "Erinnerungen"

### Neuer Eintrag in `WRAPUP_TYPES` (`src/config/wrapup.ts`)

```typescript
{
  key: "memories",
  label: "Erinnerungen",
  description: "Wichtige Infos aus der Session fuer zukuenftige Chats merken",
  icon: "Brain",
  promptTemplate: `Analysiere den gesamten bisherigen Dialog und identifiziere
Informationen die fuer zukuenftige Gespraeche relevant waeren.

Suche gezielt nach:
- Persoenliche Praeferenzen und Arbeitsweisen des Nutzers
- Projekt-Kontext, Entscheidungen, technische Rahmenbedingungen
- Wiederkehrende Anforderungen oder Workflows
- Fachliche Rollen, Verantwortlichkeiten, Team-Strukturen

Ignoriere:
- Triviale Fakten oder Smalltalk
- Einmalige Fragen ohne Wiederkehr-Relevanz
- Informationen die bereits im Memory gespeichert sind

Nutze das suggest_memory Tool um die Vorschlaege dem User zur Auswahl zu praesentieren.
Formuliere jeden Memory-Text klar, kompakt und eigenstaendig verstaendlich.
Gib fuer jeden Vorschlag einen kurzen Grund an warum er relevant ist.`
}
```

### Sonderbehandlung im Wrapup-Flow

Der `memories` Typ hat ein **abweichendes Verhalten** gegenueber den anderen 3 Typen:

- **Kein Artifact erzeugen** -- statt `create_artifact` wird `suggest_memory` aufgerufen
- **Kein Audio-Format** -- TTS-Toggle wird fuer diesen Typ ausgeblendet
- Im `buildWrapupPrompt()` entfaellt der `WICHTIG: Erstelle als Artifact...` Block
- Stattdessen: Instruktion das `suggest_memory` Tool zu nutzen

### Aenderung in `buildWrapupPrompt()` (`src/config/wrapup.ts`)

```typescript
// Bestehender Code fuer text/audio bleibt
// Neuer Branch fuer memories-Typ:
if (type.key === "memories") {
  // Kein Artifact/Audio Suffix -- Tool-Nutzung ist im promptTemplate
} else if (format === "audio") {
  sections.push(`WICHTIG: Erstelle als Audio...`)
} else {
  sections.push(`WICHTIG: Erstelle als Artifact...`)
}
```

### Aenderung in `SessionWrapupPopover`

- TTS-Toggle ausblenden wenn `selectedType === "memories"`
- Placeholder im Context-Feld aendern: "Worauf soll ich mich konzentrieren?" (nur fuer memories)
- Alles andere bleibt identisch -- gleiche Pill-Buttons, gleicher Submit-Flow

---

## Detail: suggest_memory Tool

### Tool-Definition (kein execute)

```
suggest_memory:
  inputSchema:
    suggestions: Array (1-5 Items)
      - memory: string (3-500 chars) -- die zu merkende Info
      - reason: string (max 200 chars) -- warum das relevant ist
  Kein execute → Stream pausiert, Client rendert Widget
```

### Generative UI Component: MemorySuggestion

- Folgt exakt dem `ask_user` Pattern (`src/components/generative-ui/ask-user.tsx`)
- Rendert inline im Chat-Stream
- Pro Vorschlag: Memory-Text + Grund + Speichern/Verwerfen Buttons
- "Alle speichern" / "Alle verwerfen" Bulk-Aktionen
- Nach Aktion: Read-only State (gespeichert/verworfen visuell unterschieden)
- Approved Memories: POST an `/api/user/memories`
- `addToolResult` sendet Ergebnis zurueck an LLM (welche gespeichert, welche verworfen)

### Neuer API Endpoint

```
POST /api/user/memories
Body: { memory: string }
Auth: requireAuth()
Rate-Limit: api (60/min)
Aktion: saveMemory(userId, memory)
Response: { saved: true, id: string }
```

Dieser Endpoint fehlt aktuell (nur GET + DELETE existieren).

---

## Detail: Relevance-Threshold

### Problem

Aktuell werden alle Mem0 Search-Results (bis Limit 10) ungefiltert in den System-Prompt injiziert. Low-Score Memories verschwenden das 4000-Char-Budget.

### Loesung

- Neuer Config-Wert: `minRelevanceScore` in `src/config/memory.ts` (ENV: `MEMORY_MIN_RELEVANCE`, Default: 0.4)
- Filtering in `searchMemories()` nach Mem0-Response
- Nur Memories mit `score >= minRelevanceScore` werden formatiert

### Aenderung in `src/lib/memory/index.ts`

```typescript
// Nach Mem0 search
const filtered = results.filter(m => (m.score ?? 1) >= memoryConfig.minRelevanceScore)
return filtered
```

---

## Warum Wrapup statt Mid-Chat suggest_memory?

| Kriterium | Mid-Chat Vorschlag | Wrapup-Integration |
|-----------|--------------------|--------------------|
| User-Kontrolle | AI entscheidet wann | User entscheidet wann |
| Stoerfaktor | Kann nerven wenn schlecht getimed | Null -- User loest aktiv aus |
| Context-Qualitaet | Nur aktueller Turn | Gesamte Session |
| Bekanntes Pattern | Neues Verhalten lernen | Bestehendes Wrapup-Pattern |
| Fokus-Steuerung | Nicht moeglich | Via Context-Feld |
| Implementierungsaufwand | Neues Trigger-System | Bestehende Wrapup-Infrastruktur |

---

## Dateien-Aenderungen

### Neue Dateien

| Datei | Beschreibung |
|-------|-------------|
| `src/lib/ai/tools/suggest-memory.ts` | Tool-Definition (kein execute, wie ask_user) |
| `src/components/generative-ui/memory-suggestion.tsx` | Approval-Widget mit Speichern/Verwerfen pro Item |

### Zu aendern

| Datei | Aenderung |
|-------|-----------|
| `src/config/wrapup.ts` | 4. Typ "memories" + Sonderbehandlung in `buildWrapupPrompt()` |
| `src/components/chat/session-wrapup-popover.tsx` | TTS-Toggle ausblenden bei memories, Placeholder anpassen |
| `src/app/api/chat/persist/post-response.ts` | `triggerMemoryExtraction()` Aufruf entfernen |
| `src/app/api/chat/build-tools.ts` | `suggest_memory` registrieren im memory-Block |
| `src/lib/ai/tools/registry.ts` | Registration fuer suggest_memory |
| `src/lib/memory/index.ts` | Relevance-Filter in `searchMemories()`, `extractMemories()` entfernen |
| `src/config/memory.ts` | `minRelevanceScore` hinzufuegen, `minMessages` entfernen |
| `src/app/api/user/memories/route.ts` | POST Handler hinzufuegen |
| `src/components/chat/tool-renderers.tsx` | Renderer fuer suggest_memory |
| `src/app/api/chat/schema.ts` | "memories" zum wrapupType enum hinzufuegen |

### Zu entfernen (Code)

| Was | Wo |
|-----|-----|
| `triggerMemoryExtraction()` Funktion | `post-response.ts` |
| `extractMemories()` + `toMem0Messages()` | `src/lib/memory/index.ts` |
| `MemoryExtractionParams` Interface | `post-response.ts` |
| `minMessages` Config | `src/config/memory.ts` |

### Keine Aenderung noetig

- DB-Schema (Memories sind in Mem0, nicht lokal)
- `save_memory.ts` (bleibt wie ist)
- `recall_memory.ts` (bleibt wie ist)
- Memory-Management-Dialog (bleibt wie ist)
- Memory-Indicator (bleibt wie ist)
- `resolve-context.ts` Memory-Search bei Chat-Start (bleibt wie ist)

---

## Phasen-Plan

### Phase 1: Core (geschaetzt 1-2 Sessions)

1. Auto-Extraction entfernen (`post-response.ts`, `memory/index.ts`, `memory.ts`)
2. Relevance-Threshold einbauen (`memory/index.ts`, `memory.ts`)
3. Wrapup-Typ "Erinnerungen" hinzufuegen (`wrapup.ts`, `schema.ts`)
4. Wrapup-Popover anpassen (`session-wrapup-popover.tsx`)
5. `suggest_memory` Tool erstellen (Tool-Def + Registration)
6. `MemorySuggestion` Component erstellen (Generative UI)
7. POST `/api/user/memories` Endpoint
8. Tool-Renderer einbinden

### Phase 2: Polish (optional, spaeter)

- Kategorien/Tags fuer Memories (Mem0 Metadata)
- Memory-Management UI: Filterung nach Kategorien
- Expiration Dates fuer temporaere Memories
- Memory-Statistiken in Settings
- Editierbare Vorschlaege (Memory-Text vor Speichern anpassen)

---

## Verifikation

1. **Memory deaktiviert**: Feature-Flag aus → kein suggest_memory Tool, "Erinnerungen" Wrapup-Typ nicht sichtbar
2. **User hat Memory aus**: Toggle off → "Erinnerungen" Typ im Popover ausgeblendet
3. **Explizites Speichern**: "Merke dir X" → save_memory → Memory in Mem0
4. **Wrapup Memory Flow**: Session abschliessen → "Erinnerungen" waehlen → optional Fokus-Hint → Erstellen → suggest_memory Widget → Auswahl → POST API → Memory in Mem0
5. **Fokus-Hint**: Context "Nur meine Design-Praeferenzen" → AI filtert Vorschlaege entsprechend
6. **Kein Auto-Extract**: 10+ Messages Chat → kein automatisches Speichern mehr
7. **Relevance Filter**: Memory-Search liefert nur Scores >= 0.4
8. **Recall funktioniert**: recall_memory Tool findet gespeicherte Memories
9. **TTS-Toggle**: Ausgeblendet wenn "Erinnerungen" gewaehlt
10. **EU/Local**: Funktioniert mit self-hosted Mem0 (MEM0_BASE_URL)
