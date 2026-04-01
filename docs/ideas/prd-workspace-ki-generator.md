# PRD: Workspace KI-Generator

> **Status:** Konzept
> **Erstellt:** 2026-04-01
> **Abhaengigkeiten:** Workspace Experts + Skills (existiert), AI SDK Chat-Completion

---

## 1. Feature-Uebersicht

### Das Problem

User sehen im Workspace "Neuer Expert" oder "Neuer Skill" und stehen vor einem leeren Formular. Einen guten System-Prompt zu schreiben erfordert Erfahrung: Welche Rolle? Welcher Ton? Welche Tools soll der Expert nutzen? Wie formuliert man Regeln, die das Modell zuverlaessig befolgt?

Bei Skills kommt YAML-Frontmatter, Template-Variablen (`{{var}}`), Field-Schema und die `mode`-Unterscheidung dazu. Die meisten User werden das nicht ohne Hilfe hinbekommen.

### Die Loesung

Ein "Mit KI erstellen"-Modus direkt im Workspace-Editor. Der User beschreibt in natuerlicher Sprache was er braucht. Die KI stellt 2-3 gezielte Rueckfragen, generiert dann Name, Description und System-Prompt (bzw. SKILL.md). Das Ergebnis landet im Formular — editierbar, bevor der User speichert.

### Was aendert sich gegenueber heute?

| Aspekt | Heute | Neu |
|--------|-------|-----|
| Expert erstellen | Leeres Formular, User schreibt alles selbst | Wahlweise: Selbst schreiben ODER KI-gefuehrter Dialog |
| Skill erstellen | Leerer Markdown-Editor, User muss Frontmatter kennen | Wahlweise: Selbst schreiben ODER KI-gefuehrter Dialog |
| Tool-Auswahl | Nicht exponiert (korrekt) | KI entscheidet implizit ueber System-Prompt |
| Einstiegshuerde | Hoch (Prompt-Engineering + Format-Wissen noetig) | Niedrig (natuerliche Sprache) |

---

## 2. Scope

### In Scope

- "Mit KI erstellen"-Button im Expert-Editor und Skill-Editor
- Gefuehrter Mini-Dialog (2-4 Schritte) innerhalb des Editors
- KI generiert: Name, Slug, Description, System-Prompt (Expert) bzw. komplettes SKILL.md (Skill)
- Ergebnis fuellt existierendes Formular vor — User kann alles anpassen
- Speichern ueber den existierenden Save-Flow (gleiche API, gleiche Validierung)
- Funktioniert fuer Expert-Erstellung und Skill-Erstellung (mode: skill)

### Out of Scope

- Quicktask-Erstellung (Fields/Formular-Schema ist zu komplex fuer v1)
- Aendern der API-Endpoints oder Validierung
- Tool-Auswahl durch den User (KI entscheidet implizit)
- Automatisches Speichern (User hat immer die Kontrolle)
- Sharing/Publishing von generierten Experts/Skills

---

## 3. User Flow

### Expert erstellen mit KI

```
Workspace > Meine Experten > "Neuer Expert"
                |
                v
    ┌─────────────────────────┐
    │  Wie willst du starten? │
    │                         │
    │  [Mit KI erstellen]     │
    │  [Selbst schreiben]     │
    └─────────────────────────┘
                |
          "Mit KI erstellen"
                |
                v
    ┌─────────────────────────┐
    │  Schritt 1:             │
    │  "Beschreib deinen      │
    │   Expert in ein paar    │
    │   Saetzen. Was soll     │
    │   er koennen?"          │
    │                         │
    │  [Textarea]             │
    │  [Weiter →]             │
    └─────────────────────────┘
                |
                v
    ┌─────────────────────────┐
    │  Schritt 2:             │
    │  KI stellt 2-3 gezielte │
    │  Rueckfragen basierend  │
    │  auf der Beschreibung:  │
    │                         │
    │  "Fuer welche Zielgruppe│
    │   schreibt der Expert?" │
    │  ○ B2B / Unternehmen    │
    │  ○ B2C / Endkunden      │
    │  ○ Intern / Team        │
    │                         │
    │  "Welcher Ton passt?"   │
    │  ○ Formell & sachlich   │
    │  ○ Locker & persoenlich │
    │  ○ Technisch & praezise │
    │                         │
    │  [Generieren →]         │
    └─────────────────────────┘
                |
                v
    ┌─────────────────────────┐
    │  Formular (vorausgefuellt)│
    │                         │
    │  Name: [Social Media...]│
    │  Slug: [social-media...]│
    │  Beschreibung: [...]    │
    │  System-Prompt: [...]   │
    │                         │
    │  ← Alles editierbar     │
    │                         │
    │  [Erstellen]            │
    │  [Nochmal generieren]   │
    └─────────────────────────┘
```

### Skill erstellen mit KI

Gleicher Flow, aber:
- Schritt 1 fragt zusaetzlich: "Was fuer ein Skill? Ein Wissensspeicher den die KI bei Bedarf laedt, oder ein Schnellzugriff (Quicktask) mit Formular?" → v1: Nur `mode: skill`
- Ergebnis ist ein vorausgefuellter Markdown-Editor mit komplettem SKILL.md
- User sieht das generierte Markdown und kann es anpassen

---

## 4. Technische Architektur

### KI-Integration

Die Generierung laeuft als **Server-Side AI Call** — kein Chat, kein Streaming noetig. Ein einzelner API-Aufruf mit strukturiertem Output.

**Neuer API-Endpoint:**

```
POST /api/workspace/generate
```

**Request:**
```typescript
{
  type: "expert" | "skill"
  description: string        // User-Beschreibung aus Schritt 1
  answers?: Record<string, string>  // Antworten aus Schritt 2
}
```

**Response (Expert):**
```typescript
{
  name: string
  slug: string
  description: string
  systemPrompt: string
}
```

**Response (Skill):**
```typescript
{
  content: string  // Komplettes SKILL.md mit Frontmatter
}
```

### Zwei-Phasen-Ansatz

**Phase 1 — Rueckfragen generieren:**
```
POST /api/workspace/generate/questions
Body: { type: "expert" | "skill", description: string }
Response: { questions: [{ key, label, options: string[] }] }
```

Die KI analysiert die Beschreibung und generiert 2-3 kontextspezifische Fragen. Keine generischen Fragen — die Fragen haengen davon ab, was der User beschrieben hat.

Beispiel: "Ich brauche einen Expert fuer Angebote" → Fragen zu Branche, Formatlitaet, Angebotsstruktur.
Beispiel: "Hilfe beim Programmieren" → Fragen zu Sprachen, Framework-Praeferenzen, Code-Stil.

**Phase 2 — Generieren:**
```
POST /api/workspace/generate
Body: { type, description, answers }
Response: { name, slug, description, systemPrompt } oder { content }
```

### System-Prompt fuer den Generator

Der Generator braucht einen eigenen System-Prompt der:
- Die verfuegbaren Tools der Plattform kennt (web_search, create_artifact, generate_image, etc.)
- Weiss wie ein guter System-Prompt aufgebaut ist (Rolle, Prinzipien, Tool-Sektion, Grenzen)
- Tool-Entscheidungen implizit trifft (nicht exponiert)
- Die bestehenden Seed-Experten als Qualitaetsreferenz hat
- SKILL.md Format mit Frontmatter und Template-Syntax beherrscht

**Speicherort:** `src/lib/ai/prompts/workspace-generator.ts`

Der System-Prompt enthaelt:
1. Rollendesfinition des Generators
2. Struktur eines guten System-Prompts (aus den existierenden Seeds abstrahiert)
3. Liste der verfuegbaren Tools mit Kurzbeschreibung (damit der Generator weiss, was er im System-Prompt referenzieren kann)
4. Qualitaetsregeln (keine KI-Woerter, konkrete Anweisungen, Grenzen definieren)
5. Fuer Skills: SKILL.md Format-Spezifikation mit Frontmatter-Schema

### Structured Output

Beide Phasen nutzen **Zod-Schema + `generateObject()`** aus dem AI SDK fuer garantiert validen Output:

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
const expertSchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
})

// Phase 2: Skill
const skillSchema = z.object({
  content: z.string(), // Komplettes SKILL.md
})
```

### Kein neues Modell noetig

Der Generator nutzt den Default-Model via `resolveModel()`. Structured Output funktioniert mit allen unterstuetzten Modellen (Anthropic, Google, OpenAI). Kein spezielles Modell noetig.

---

## 5. UI-Komponenten

### Neue Komponenten

| Komponente | Datei | Beschreibung |
|-----------|-------|-------------|
| `WorkspaceGeneratorWizard` | `workspace/workspace-generator-wizard.tsx` | 2-Schritt-Dialog (Beschreibung → Rueckfragen → Generieren) |

### Geaenderte Komponenten

| Komponente | Aenderung |
|-----------|-----------|
| `WorkspaceExpertEditor` | Neuer State "generator" vor dem Formular. Toggle zwischen "Mit KI erstellen" und "Selbst schreiben". Wenn Generator fertig: Felder vorausfuellen. |
| `WorkspaceSkillEditor` | Gleiche Erweiterung. Generator liefert `content` das in den Markdown-Editor gesetzt wird. |

### Wizard-Design

Der Wizard ist **kein Modal und kein separater Dialog**. Er ersetzt temporaer den Editor-Bereich:

```
┌─────────────────────────────────────┐
│  ← Selbst schreiben                │   ← Link zurueck zum leeren Editor
│                                     │
│  Beschreib deinen Expert            │   ← Ueberschrift
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Ich brauche einen Expert    │    │   ← Textarea, autofocus
│  │ der mir hilft Angebote zu   │    │
│  │ schreiben fuer meine...     │    │
│  └─────────────────────────────┘    │
│                                     │
│                    [Weiter →]       │
└─────────────────────────────────────┘
```

Nach "Weiter": Ladeindikator, dann Rueckfragen als Radio-Gruppen. Nach "Generieren": Ladeindikator, dann Wechsel zum vorausgefuellten Formular.

---

## 6. Sicherheit

### Validierung

- Der generierte Output durchlaeuft die **identische Validierung** wie manuell erstellte Experts/Skills
- Expert: Zod-Schema (`createExpertSchema`) — Name 2-100, Slug Regex, Description 5-500, SystemPrompt 10-10000
- Skill: `parseSkillMarkdown()` — Frontmatter-Pflichtfelder, Slug-Regex, Content-Limits
- `isPublic: false` wird serverseitig erzwungen (unveraendert)
- userId-Scoping auf allen Mutations (unveraendert)
- 20-Skill-Limit (unveraendert)

### Rate Limiting

- `/api/workspace/generate` und `/api/workspace/generate/questions` bekommen eigenes Rate Limit
- Empfehlung: 10 Requests/Minute (LLM-Calls sind teuer)
- Nutzt das existierende Token-Bucket-System

### Prompt Injection

- Der User-Input (Beschreibung + Antworten) geht als **User-Message** an die KI, nicht als System-Prompt
- Der Generator-System-Prompt ist server-seitig, nicht manipulierbar
- Der generierte System-Prompt wird dem User zur Review gezeigt bevor er speichert
- Worst Case: Der Generator erzeugt einen schlechten System-Prompt → User sieht ihn im Formular und kann ihn aendern oder verwerfen

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
4. Manuell testen (curl/Postman)

### Milestone 2: Wizard-Komponente

**Dateien:**
- `src/components/workspace/workspace-generator-wizard.tsx` — Der 2-Schritt-Wizard

**Tasks:**
1. Wizard mit 3 States: `describe` → `questions` → `generating`
2. API-Integration (fetch → render questions → fetch → callback)
3. Loading-States, Error-Handling
4. `onComplete` Callback mit generiertem Expert/Skill

### Milestone 3: Editor-Integration

**Dateien:**
- `src/components/workspace/workspace-expert-editor.tsx` — Toggle + Prefill
- `src/components/workspace/workspace-skill-editor.tsx` — Toggle + Prefill

**Tasks:**
1. Neuer State `mode: "manual" | "generator"` im Editor
2. "Mit KI erstellen" / "Selbst schreiben" Toggle
3. Wizard-`onComplete` fuellt Formular-Felder vor
4. "Nochmal generieren" Button im vorausgefuellten Formular
5. Edge Cases: Slug-Kollision, Validation-Fehler nach Generierung

### Milestone 4: Review + Polish

**Tasks:**
1. Qualitaet der generierten Prompts pruefen (5-10 verschiedene Use Cases)
2. Generator-System-Prompt iterieren basierend auf Ergebnissen
3. Mobile-Responsiveness testen
4. Error-States und Edge Cases (Netzwerkfehler, leere Beschreibung, Rate Limit)

---

## 8. Offene Fragen

| Frage | Empfehlung |
|-------|-----------|
| Quicktask-Generierung in v1? | Nein. Field-Schema + Template-Variablen sind zu komplex. Spaeter als v2. |
| Soll der Generator bestehende Experts als Kontext bekommen? | Nein in v1. Haelt den Prompt schlank. Spaeter: "Aehnlich wie mein Expert X" als Option. |
| Braucht der Wizard mehr als 2-3 Rueckfragen? | Nein. Mehr Fragen = hoeherer Abbruch. Die KI soll mit wenig Input gute Ergebnisse liefern. |
| Credits fuer Generator-Calls? | Ja, wenn Credit-System aktiv. Sonst: Rate Limit reicht. |
