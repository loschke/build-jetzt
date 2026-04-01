# PRD: Workspace KI-Generator

> **Status:** Implementierungsbereit
> **Erstellt:** 2026-04-01
> **Ueberarbeitet:** 2026-04-01 (v2 — KI-only fuer User, strukturierte Vorschau)
> **Abhaengigkeiten:** Workspace Experts + Skills (existiert), AI SDK generateObject

---

## 1. Feature-Uebersicht

### Das Problem

User sehen im Workspace "Neuer Expert" oder "Neuer Skill" und stehen vor einem leeren Formular. Einen guten System-Prompt zu schreiben erfordert Erfahrung: Welche Rolle? Welcher Ton? Welche Tools soll der Expert nutzen? Wie formuliert man Regeln, die das Modell zuverlaessig befolgt?

Bei Skills kommt YAML-Frontmatter, Template-Variablen (`{{var}}`), Field-Schema und die `mode`-Unterscheidung dazu. Fehleingaben koennen die Anwendung beeintraechtigen.

### Die Loesung

Der manuelle Editor wird fuer regulaere User entfernt. Stattdessen: Ein KI-gefuehrter Wizard als **einziger Erstellungspfad**. Der User beschreibt in natuerlicher Sprache was er braucht. Die KI stellt 2-3 gezielte Rueckfragen, generiert dann das Ergebnis. Eine strukturierte Vorschau zeigt alles vor dem Speichern — mit Inline-Editing fuer gezielte Anpassungen.

Der manuelle Editor bleibt im Admin-Panel fuer Admins erhalten.

### Was aendert sich gegenueber heute?

| Aspekt | Heute | Neu |
|--------|-------|-----|
| Expert erstellen (User) | Leeres Formular, User schreibt alles selbst | KI-Wizard → Vorschau → Speichern |
| Skill erstellen (User) | Leerer Markdown-Editor, User muss Frontmatter kennen | KI-Wizard → Vorschau → Speichern |
| Expert/Skill bearbeiten (User) | Formular/Markdown-Editor mit bestehenden Werten | Strukturierte Vorschau mit Inline-Edit |
| Admin-Panel | Formular + Import | Unveraendert |
| Tool-Auswahl | Nicht exponiert | KI entscheidet implizit ueber System-Prompt |
| Einstiegshuerde | Hoch (Prompt-Engineering + Format-Wissen noetig) | Niedrig (natuerliche Sprache) |
| Fehlerrisiko | Hoch (ungueltige Prompts, kaputtes Frontmatter) | Niedrig (KI generiert valide Struktur, Validierung vor Save) |

---

## 2. Scope

### In Scope

- KI-Wizard als einziger Erstellungspfad fuer User (kein manuelles Formular)
- Gefuehrter Mini-Dialog (2-3 Schritte) innerhalb des Editors
- KI generiert: Name, Slug, Description, System-Prompt (Expert) bzw. komplettes SKILL.md (Skill)
- Strukturierte Vorschau mit Inline-Editing vor dem Speichern
- Bearbeitung bestehender Experts/Skills ueber gleiche Vorschau-Komponente
- Speichern nach Validierung ueber existierende API-Endpoints
- Funktioniert fuer Expert-Erstellung und Skill-Erstellung (mode: skill)

### Out of Scope

- Quicktask-Erstellung (Fields/Formular-Schema ist zu komplex fuer v1)
- "Mit KI anpassen" beim Bearbeiten (v1.1 — User editiert direkt in der Vorschau)
- Tool-Auswahl durch den User (KI entscheidet implizit)
- Automatisches Speichern (User hat immer die Kontrolle)
- Sharing/Publishing von generierten Experts/Skills
- Aenderungen am Admin-Panel

---

## 3. User Flows

### 3.1 Expert erstellen

```
Workspace > Meine Experten > "Neuer Expert"
                |
                v
    ┌─────────────────────────┐
    │  Beschreib deinen Expert│
    │                         │
    │  ┌─────────────────────┐│
    │  │ Ich brauche einen   ││
    │  │ Expert der mir bei  ││
    │  │ Angeboten hilft...  ││
    │  └─────────────────────┘│
    │                         │
    │           [Weiter →]    │
    └─────────────────────────┘
                |
                v
    ┌─────────────────────────┐
    │  KI stellt 2-3 gezielte │
    │  Rueckfragen:           │
    │                         │
    │  "Fuer welche Branche?" │
    │  ○ Agentur / Kreativ    │
    │  ○ IT / Software        │
    │  ○ Beratung             │
    │  ○ Andere               │
    │                         │
    │  "Welcher Ton?"         │
    │  ○ Formell & sachlich   │
    │  ○ Locker & persoenlich │
    │  ○ Technisch & praezise │
    │                         │
    │        [Generieren →]   │
    └─────────────────────────┘
                |
                v
    ┌─────────────────────────────────┐
    │  Vorschau                       │
    │                                 │
    │  Name         [✏] Social Media..│
    │  Beschreibung [✏] Schreibt...  │
    │  ─────────────────────────────  │
    │  System-Prompt            [✏]  │
    │  ┌─────────────────────────┐   │
    │  │ Du bist ein erfahrener  │   │
    │  │ Texter fuer Social...   │   │
    │  │ (formatiert, read-only) │   │
    │  └─────────────────────────┘   │
    │                                 │
    │  [Nochmal generieren]           │
    │  [Erstellen]                    │
    └─────────────────────────────────┘
```

### 3.2 Expert bearbeiten

```
Workspace > Meine Experten > ✏ (Stift-Icon)
                |
                v
    ┌─────────────────────────────────┐
    │  Expert bearbeiten              │
    │                                 │
    │  Name         [✏] Social Media..│
    │  Beschreibung [✏] Schreibt...  │
    │  ─────────────────────────────  │
    │  System-Prompt            [✏]  │
    │  ┌─────────────────────────┐   │
    │  │ Du bist ein erfahrener  │   │
    │  │ Texter fuer Social...   │   │
    │  │ (formatiert, read-only) │   │
    │  └─────────────────────────┘   │
    │                                 │
    │  [Speichern]                    │
    └─────────────────────────────────┘
```

Klick auf ✏ oeffnet Inline-Edit fuer das jeweilige Feld. Beim System-Prompt: Textarea ersetzt die formatierte Ansicht.

### 3.3 Skill erstellen

Gleicher Wizard-Flow wie Expert. Unterschiede:
- KI generiert komplettes SKILL.md (Frontmatter + Markdown-Content)
- Vorschau zeigt: Name, Description, Modus — und darunter den Skill-Content formatiert
- Inline-Edit fuer Name/Description: einfache Felder
- Inline-Edit fuer Content: Markdown-Editor (der existierende `MarkdownEditor`)

### 3.4 Skill bearbeiten

Gleiche Vorschau wie nach Erstellung. Name/Description als Felder, Content im Markdown-Editor.

---

## 4. Technische Architektur

### Zwei-Phasen-Ansatz mit generateObject

Die Generierung laeuft als **Server-Side AI Call** — kein Chat, kein Streaming. Structured Output via `generateObject()`.

**Phase 1 — Rueckfragen generieren:**
```
POST /api/workspace/generate/questions
Body: { type: "expert" | "skill", description: string }
Response: { questions: [{ key, label, options: string[] }] }
```

Die KI analysiert die Beschreibung und generiert 2-3 kontextspezifische Fragen. Keine generischen Fragen — die Fragen haengen davon ab, was der User beschrieben hat.

Beispiel: "Ich brauche einen Expert fuer Angebote" → Fragen zu Branche, Formalitaet, Angebotsstruktur.
Beispiel: "Hilfe beim Programmieren" → Fragen zu Sprachen, Framework-Praeferenzen, Code-Stil.

**Phase 2 — Generieren:**
```
POST /api/workspace/generate
Body: { type: "expert" | "skill", description: string, answers: Record<string, string> }
Response (Expert): { name, slug, description, systemPrompt }
Response (Skill):  { content }   // Komplettes SKILL.md
```

### Structured Output Schemas

```typescript
// Phase 1: Rueckfragen
const questionsSchema = z.object({
  questions: z.array(z.object({
    key: z.string(),
    label: z.string(),
    options: z.array(z.string()).min(2).max(4),
  })).min(2).max(3),
})

// Phase 2: Expert
const expertResultSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(80),
  description: z.string().min(5).max(500),
  systemPrompt: z.string().min(10).max(10000),
})

// Phase 2: Skill
const skillResultSchema = z.object({
  content: z.string().min(50),  // SKILL.md mit Frontmatter
})
```

### System-Prompt fuer den Generator

**Speicherort:** `src/lib/ai/prompts/workspace-generator.ts`

Der System-Prompt enthaelt:
1. Rollendefinition: "Du generierst Expert-Definitionen / Skill-Dateien fuer eine KI-Chat-Plattform"
2. Struktur eines guten System-Prompts (Rolle → Prinzipien → Tools → Ausgabeformat → Grenzen)
3. Liste der verfuegbaren Tools mit Kurzbeschreibung (damit der Generator weiss, welche Tools er im System-Prompt referenzieren kann — ohne dass der User davon erfaehrt)
4. Qualitaetsregeln: Keine KI-Woerter, konkrete Anweisungen, Grenzen definieren, deutscher Output
5. Fuer Skills: SKILL.md Format-Spezifikation mit Frontmatter-Schema und Template-Syntax
6. Beispiel-Referenz: Struktur der bestehenden Seed-Experten als Qualitaetsmassstab

### Model Resolution

Der Generator nutzt den Default-Model via `resolveModel()`. Structured Output funktioniert mit allen unterstuetzten Modellen. Kein spezielles Modell noetig.

---

## 5. UI-Komponenten

### Neue Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| `WorkspaceGeneratorWizard` | `workspace/workspace-generator-wizard.tsx` | 2-Schritt-Wizard (Beschreibung → Rueckfragen → Callback) |
| `WorkspaceExpertPreview` | `workspace/workspace-expert-preview.tsx` | Strukturierte Vorschau mit Inline-Edit fuer Expert-Felder |
| `WorkspaceSkillPreview` | `workspace/workspace-skill-preview.tsx` | Strukturierte Vorschau mit Inline-Edit fuer Skill-Felder + Content |

### Umgebaute Komponenten

| Komponente | Aenderung |
|-----------|-----------|
| `WorkspaceExpertEditor` | Komplett umgebaut: Wizard → Preview → Save. Kein leeres Formular mehr. Bearbeiten = Preview mit Inline-Edit. |
| `WorkspaceSkillEditor` | Komplett umgebaut: Wizard → Preview → Save. Kein Markdown-Editor als Startpunkt. Bearbeiten = Preview mit Inline-Edit. |

### Preview-Komponente (Expert)

```
┌───────────────────────────────────────────┐
│  Name                                      │
│  ┌──────────────────────────────────┐ [✏] │
│  │ Social Media Texter              │      │
│  └──────────────────────────────────┘      │
│                                            │
│  Beschreibung                              │
│  ┌──────────────────────────────────┐ [✏] │
│  │ Schreibt Posts fuer LinkedIn,    │      │
│  │ Instagram und Twitter/X.        │      │
│  └──────────────────────────────────┘      │
│                                            │
│  System-Prompt                             │
│  ┌──────────────────────────────────┐ [✏] │
│  │ ## Rolle                        │      │
│  │ Du bist ein erfahrener Texter   │      │
│  │ fuer Social Media...            │      │
│  │                                  │      │
│  │ ## Prinzipien                   │      │
│  │ - Kurz und praegnant            │      │
│  │ - Aktivierende Sprache          │      │
│  │ ...                              │      │
│  └──────────────────────────────────┘      │
│                                            │
│  [Nochmal generieren]  [Erstellen]         │
│  (nur bei Neu-Erstellung)                  │
│                                            │
│  [Speichern]                               │
│  (nur bei Bearbeitung)                     │
└───────────────────────────────────────────┘
```

**Inline-Edit Verhalten:**
- Klick auf ✏ bei Name/Description: Input/Textarea wird editierbar, ✏ wird zu ✓ (Bestaetigen)
- Klick auf ✏ bei System-Prompt: Formatierte Ansicht wird zu Textarea, ✏ wird zu ✓
- System-Prompt Vorschau: Markdown-artige Formatierung (Headings, Listen erkennbar) aber kein voller Renderer — einfaches `pre` mit Syntax-Highlighting reicht

---

## 6. Sicherheit

### Validierung

- Der generierte Output durchlaeuft die **identische Validierung** wie bisher
- Expert: Zod-Schema (`createExpertSchema`) — Name 2-100, Slug Regex, Description 5-500, SystemPrompt 10-10000
- Skill: `parseSkillMarkdown()` — Frontmatter-Pflichtfelder, Slug-Regex, Content-Limits
- `isPublic: false` wird serverseitig erzwungen (unveraendert)
- userId-Scoping auf allen Mutations (unveraendert)
- 20-Skill-Limit (unveraendert)
- Validierung passiert **vor dem Speichern** client-seitig (Laengen, Pflichtfelder) UND server-seitig (API-Endpoint)

### Rate Limiting

- `/api/workspace/generate/*` Endpoints: 10 Requests/Minute (LLM-Calls sind teuer)
- Nutzt das existierende Token-Bucket-System aus `src/lib/rate-limit.ts`

### Prompt Injection

- Der User-Input (Beschreibung + Antworten) geht als **User-Message** an die KI, nicht als System-Prompt
- Der Generator-System-Prompt ist server-seitig, nicht manipulierbar
- Der generierte Output wird dem User in der Vorschau gezeigt bevor er speichert
- Worst Case: Der Generator erzeugt einen unpassenden System-Prompt → User sieht ihn in der Vorschau und kann ihn aendern oder verwerfen

### Credits

- Wenn Credits aktiviert: Generator-Calls kosten Credits (wie ein normaler Chat-Turn)
- Beides (Fragen + Generierung) zusammen = 2 LLM-Calls

---

## 7. Implementierungsplan

### Milestone 1: Generator-Backend (API + Prompt)

**Dateien:**
- `src/lib/ai/prompts/workspace-generator.ts` — System-Prompt fuer den Generator
- `src/app/api/workspace/generate/questions/route.ts` — Phase 1: Rueckfragen
- `src/app/api/workspace/generate/route.ts` — Phase 2: Expert/Skill generieren

**Tasks:**
1. System-Prompt schreiben (Tool-Liste, Qualitaetsregeln, Format-Specs)
2. Zod-Schemas fuer structured output definieren
3. API-Endpoints mit `generateObject()`, Rate Limiting, Auth

### Milestone 2: Preview-Komponenten

**Dateien:**
- `src/components/workspace/workspace-expert-preview.tsx` — Expert-Vorschau mit Inline-Edit
- `src/components/workspace/workspace-skill-preview.tsx` — Skill-Vorschau mit Inline-Edit

**Tasks:**
1. Strukturierte Vorschau mit Read-Only-Feldern
2. Inline-Edit Toggle pro Feld (✏ → ✓)
3. System-Prompt als formatiertes `pre` / Textarea Toggle
4. Save-Handler (POST fuer Neu, PATCH/PUT fuer Edit)
5. Validation-Fehler anzeigen (Slug-Kollision, Pflichtfelder)

### Milestone 3: Wizard + Editor-Umbau

**Dateien:**
- `src/components/workspace/workspace-generator-wizard.tsx` — 2-Schritt-Wizard
- `src/components/workspace/workspace-expert-editor.tsx` — Umbau: Wizard → Preview
- `src/components/workspace/workspace-skill-editor.tsx` — Umbau: Wizard → Preview

**Tasks:**
1. Wizard-Komponente: `describe` → `questions` → `generating` States
2. Expert-Editor: Neu = Wizard → Preview. Edit = Preview direkt.
3. Skill-Editor: Gleicher Umbau.
4. "Nochmal generieren" → Zurueck zum Wizard mit vorheriger Beschreibung
5. Loading-States, Error-Handling

### Milestone 4: Review + Polish

**Tasks:**
1. Qualitaet der generierten Prompts pruefen (5-10 verschiedene Use Cases testen)
2. Generator-System-Prompt iterieren basierend auf Ergebnissen
3. Mobile-Responsiveness testen
4. Edge Cases: Netzwerkfehler, leere Beschreibung, Rate Limit, Slug-Kollision

---

## 8. Offene Fragen (entschieden)

| Frage | Entscheidung |
|-------|-------------|
| Manueller Editor fuer User? | Nein. KI-Wizard ist der einzige Erstellungspfad. Manuell bleibt im Admin-Panel. |
| Tool-Auswahl exponieren? | Nein. KI entscheidet implizit ueber den System-Prompt. |
| Quicktask-Generierung in v1? | Nein. Field-Schema + Template-Variablen sind zu komplex. Spaeter als v2. |
| "Mit KI anpassen" beim Bearbeiten? | Nicht in v1. User editiert direkt in der Vorschau. Spaeter als v1.1. |
| Credits fuer Generator-Calls? | Ja, wenn Credit-System aktiv. Sonst: Rate Limit reicht. |
