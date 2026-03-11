# Kontext-Pflege: Systemprompts, Knowledge und Chat-Konfiguration

Anleitung fuer die Pflege der AI-Kontexte in diesem Boilerplate. Es gibt zwei getrennte Systeme: den **Sidebar-Chat** (modulbezogen) und den **Fullpage-Assistenten** (expertenbezogen). Beide lesen ihre Kontexte aus Markdown-Dateien unter `src/content/`.

---

## Ordnerstruktur im Ueberblick

```
src/content/
├── guides/                        <- Sidebar-Chat (modulbezogen)
│   └── {guide-name}/
│       ├── system.md              <- Rolle + Verhalten des Chat-Experten
│       ├── modules/
│       │   └── {modul-slug}.md    <- Kontext pro Lernmodul
│       └── questions/
│           └── {modul-slug}.json  <- Quick Questions pro Modul
│
└── assistants/                    <- Fullpage-Assistent (expertenbezogen)
    └── {expert-slug}/
        ├── system.md              <- Rolle + Verhalten des Experten
        ├── knowledge/             <- Wissensbasis (beliebig viele .md Files)
        │   └── {thema}.md
        └── config.json            <- Name, Emoji, Beschreibung, Suggestions
```

---

## 1. Sidebar-Chat (`guides/`)

### Wann verwenden

Der Sidebar-Chat reagiert auf das aktuelle Lernmodul. Wenn ein User auf der Seite "4K Framework" ist, bekommt der Chat automatisch den Kontext aus `modules/4k-framework.md` dazu. Gut fuer: kontextsensitive Hilfe innerhalb eines Moduls.

### Dateien im Detail

**`system.md`** — Die Persoenlichkeit des Chat-Experten. Wird bei **jeder** Nachricht mitgesendet.

Inhalt definieren:
- Rolle (wer ist der Experte)
- Tonalitaet (wie spricht er)
- Antwortformat (Laenge, Markdown, Stil)
- Einschraenkungen (was beantwortet er nicht)

Beispiel-Aufbau:
```markdown
Du bist ein erfahrener Experte fuer [Thema].

## Deine Rolle
- [Was der Experte tut]

## Tonalitaet
- [Wie er spricht]

## Antwortformat
- [Strukturvorgaben]

## Einschraenkungen
- [Was er ablehnt]
```

**`modules/{slug}.md`** — Zusaetzlicher Kontext pro Modul. Wird nur geladen wenn der User sich auf der entsprechenden Seite befindet.

Inhalt definieren:
- Aktueller Modulkontext (worum geht es)
- Lernziele des Moduls
- Wichtige Konzepte und Begriffe
- Optional: Beispiele die der Experte kennen soll

Der Slug muss mit dem `chatContext`-Feld in `src/config/navigation.ts` uebereinstimmen.

**`questions/{slug}.json`** — Quick Questions als Einstiegshilfe (werden im leeren Chat angezeigt).

Format:
```json
[
  {
    "text": "Die Frage die der User klicken kann",
    "category": "optionale Kategorie"
  }
]
```

### Neues Modul hinzufuegen

1. Markdown-Datei anlegen: `src/content/guides/{guide}/modules/{slug}.md`
2. Questions anlegen: `src/content/guides/{guide}/questions/{slug}.json`
3. Navigation erweitern: `chatContext: "{slug}"` in `src/config/navigation.ts`

---

## 2. Fullpage-Assistent (`assistants/`)

### Wann verwenden

Der Assistent ist ein eigenstaendiger Chat auf `/assistant`. Statt modulbezogenem Kontext arbeitet er mit **Expertenrollen** — jeder Experte hat sein eigenes Wissen. Gut fuer: allgemeine Fragen, spezialisierte Beratung, laengere Gespraeche.

### Dateien im Detail

**`config.json`** — Metadaten des Experten. Steuert wie er im UI erscheint.

```json
{
  "name": "Content Stratege",
  "emoji": "✍️",
  "description": "Hilft bei Content-Planung und Themenrecherche.",
  "suggestions": [
    "Erstelle einen Redaktionsplan",
    "Welche Formate passen zu meiner Zielgruppe?"
  ]
}
```

| Feld | Zweck |
|------|-------|
| `name` | Anzeigename im Experten-Selector und Header |
| `emoji` | Icon neben dem Namen und bei Nachrichten |
| `description` | Kurzbeschreibung unter dem Namen im Selector |
| `suggestions` | Vorschlaege im leeren Chat (max. 4-5 stueck) |

**`system.md`** — Persoenlichkeit und Verhalten. Gleicher Aufbau wie beim Sidebar-Chat (Rolle, Ton, Format, Grenzen). Wird bei jeder Nachricht mitgesendet.

**`knowledge/*.md`** — Die Wissensbasis. Alle Markdown-Dateien in diesem Ordner werden alphabetisch gelesen und als Kontextblock an den Systemprompt angehaengt. Das Ergebnis sieht fuer das Modell so aus:

```
[Inhalt von system.md]

---

## Kontext-Wissen

### dateiname-a
[Inhalt der Datei]

### dateiname-b
[Inhalt der Datei]
```

### Neuen Experten anlegen

1. Ordner erstellen: `src/content/assistants/{expert-slug}/`
2. `config.json` anlegen (Name, Emoji, Description, Suggestions)
3. `system.md` schreiben (Rolle und Verhalten)
4. `knowledge/` Ordner anlegen und Wissens-Dateien ablegen
5. Fertig — der Experte erscheint automatisch im Selector

Der Slug muss dem Pattern `[a-z0-9-]` entsprechen (Kleinbuchstaben, Zahlen, Bindestriche).

---

## Best Practices

### Systemprompts (`system.md`)

**Kurz und praezise.** Das Modell bekommt den Systemprompt bei jeder Nachricht. Jedes ueberflussige Wort kostet Tokens und verwassert die Anweisung.

**Verhalten vor Wissen.** Der Systemprompt definiert *wie* der Experte spricht und handelt, nicht *was* er weiss. Fachwissen gehoert in Knowledge-Dateien oder Modul-Kontexte.

**Negative Anweisungen sparsam.** "Antworte nicht auf Off-Topic Fragen" ist besser als 20 Zeilen darueber, was alles off-topic ist.

**Aufbau-Template:**
```markdown
Du bist [Rolle mit einem Satz].

## Verhalten
- [3-5 Punkte wie der Experte agiert]

## Format
- [Antwortlaenge, Strukturvorgaben]

## Grenzen
- [1-3 klare Einschraenkungen]
```

### Knowledge-Dateien

**Ein Thema pro Datei.** Nicht alles in eine grosse Datei packen. Lieber `produktkatalog.md`, `preismodell.md`, `faq.md` als `alles.md`. Das macht die Pflege einfacher.

**Dateinamen als Ueberschriften.** Der Dateiname wird als `### dateiname` Ueberschrift eingefuegt. Sprechende Namen waehlen: `onboarding-prozess.md` statt `doc1.md`.

**Alphabetische Sortierung beachten.** Dateien werden alphabetisch geladen. Wenn die Reihenfolge wichtig ist, Praefix verwenden: `01-grundlagen.md`, `02-aufbau.md`.

**Keine Redundanz zum Systemprompt.** Wenn der Systemprompt schon sagt "Du bist ein Design-Experte", muss die Knowledge-Datei das nicht wiederholen.

**Groesse im Blick behalten.** Alle Knowledge-Dateien zusammen plus Systemprompt bilden den System-Kontext. Je groesser der Kontext, desto mehr Tokens pro Nachricht. Als Richtwert: unter 3000-4000 Woerter gesamt bleiben.

### Modul-Kontexte (`modules/*.md`)

**Kontext, nicht Lehrmaterial.** Die Datei sagt dem Experten, worauf sich der User gerade bezieht. Sie ersetzt nicht den eigentlichen Lerninhalt auf der Seite.

**Lernziele nennen.** Damit der Experte weiss, was der User in diesem Modul erreichen soll, und seine Antworten darauf ausrichten kann.

**Begriffe definieren.** Fachbegriffe die im Modul vorkommen kurz erklaeren, damit der Experte sie konsistent verwendet.

### Quick Questions / Suggestions

**Konkret formulieren.** "Erklaere mir das 4K Framework" ist besser als "Hilfe". Der User soll sofort sehen, was er bekommt.

**Verschiedene Einstiegspunkte.** Mischen: eine Erklaer-Frage, eine Beispiel-Frage, eine Praxis-Frage. Nicht drei Varianten der gleichen Frage.

**3-5 Stueck sind genug.** Zu viele Optionen ueberfordern. Die Suggestions sind Einstiegshilfen, kein Menue.

---

## Konfigurationsdateien

| Datei | Steuert |
|-------|---------|
| `src/config/chat.ts` | Sidebar-Chat: Model, Tokens, Temperatur, Guide-Pfad, Experten-Name/Emoji |
| `src/config/assistants.ts` | Fullpage-Assistent: Model, Tokens, Temperatur, Artifact-Schwelle, Navigation |
| `src/config/features.ts` | Feature-Flag `assistant.enabled` (gebunden an `NEXT_PUBLIC_CHAT_ENABLED`) |
| `src/config/navigation.ts` | Sidebar-Link zum Assistenten, `chatContext` Slugs fuer Module |

### Model aendern

In `chat.ts` bzw. `assistants.ts` das `model`-Feld anpassen. Format: `provider/model-name` (AI Gateway).

```typescript
model: "anthropic/claude-sonnet-4-6",  // Default
model: "anthropic/claude-haiku-4-5",   // Schneller, guenstiger
model: "openai/gpt-4o",                // OpenAI Alternative
```

### Antwortlaenge steuern

`maxTokens` in der jeweiligen Config. Der Sidebar-Chat hat 1024 (kompakte Antworten), der Assistent 4096 (laengere Ausfuehrungen, Artifacts). Anpassen je nach Use Case.

---

## Zusammenfassung: Was kommt wohin

| Ich will... | Datei | Ordner |
|---|---|---|
| Experten-Persoenlichkeit definieren | `system.md` | guides oder assistants |
| Fachwissen fuer einen Experten hinterlegen | `{thema}.md` | `assistants/{expert}/knowledge/` |
| Kontext fuer ein Lernmodul setzen | `{slug}.md` | `guides/{guide}/modules/` |
| Einstiegsfragen fuer ein Modul | `{slug}.json` | `guides/{guide}/questions/` |
| Einstiegsfragen fuer einen Experten | `config.json` → `suggestions` | `assistants/{expert}/` |
| Neuen Experten anlegen | Ganzer Ordner | `assistants/{neuer-slug}/` |
