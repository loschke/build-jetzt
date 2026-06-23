# SAVA-Wissensdatenbank — Übergabe an build-jetzt (Experten-/Skill-Design)

> Kontext-Übergabe für den Claude-Agenten in **build-jetzt**. Gibt dir, was die SAVA-Wissensdatenbank leistet, für wen sie ist, und wie ihr die vorhandene Experten-/Skill-/MCP-Mechanik nutzt, um zwei Ziele umzusetzen: **(A) Übersetzung je Zielgruppe** und **(B) fokussierte Erkundung von Teilbereichen** im Dialog. Die KB-Seite ist abgeschlossen und veröffentlicht; hier geht es um die Konsumenten-Seite.

---

## 1. Was die SAVA-KB ist (Kurz-Charta)

Markdown-Vault der **Mission SAVA** (AOK Sachsen-Anhalt, Kunde queo). GitHub-synchronisiert, über MCP-Hub als Wissensquelle exponiert. Bei euch bereits registriert als MCP-Server **`sava-agent-context`** (`seeds/mcp-servers/sava.md`).

- **Zweck:** Single Source of Truth für das **beständige Mission-Fundament** — Modelle, Definitionen, Prinzipien, Architektur-Entscheidungen, Regelwerke, Compliance-Rahmen.
- **Bewusst NICHT drin:** kein aufbereiteter Projekt-Wissenskorpus (die hunderte Pflege-Bausteine leben außerhalb), kein Dynamisches (Roadmaps, Beträge, Namen, Termine), **keine Übersetzungen/Tonalitäts-Varianten** (das ist EURE Aufgabe — siehe §3), kein operatives Klein-Klein.
- **Zwei Konsumenten:** die menschlichen Mission-Stewards (queo+AOK) und **KI-Assistenten** (= ihr).
- **Ordnerstruktur:** `00_Mission` (Vision, Strategie, Branding, Projekttypen, Glossar), `01_Framework` (generisches Agentenmodell), `02_AOK-Kontext` (Organisation + regulatorischer Rahmen), `03_SAVA-Architektur` (Sensor/Motor/Stimme/Kompass, Klassifikationen, Risiko-Zonierung, Hosting), `04_Kommunikation` (Wording, Transparenz, Case-for-Change), `05_Methodik` (Phase-0-Discovery), `06_Entwicklung` (Wissensmanagement, LLM-Grundlagen).

---

## 2. Die KB-Filter-Achsen — so steuert ihr Reichweite & Fokus

Jedes KB-File trägt vier orthogonale Frontmatter-Achsen. **Genau hierüber realisiert ihr Zielgruppe und Fokus.** Filterbar über das MCP-Tool `kb_filter_by_frontmatter` (Operatoren `eq` / `in` / `contains`).

| Achse | Steuert | Werte |
| --- | --- | --- |
| `scope` | **welcher Assistent** das File sehen darf | `mission` (alle) · `projekt:<name>` (nur dieser) |
| `audience` | **welche Rolle** das File adressiert | `queo-team`, `aok-mitarbeiter`, `fuehrungskraft`, `entscheider`, `praktiker`, `konzepter`, `redaktion`, `compliance`, `entwickler`, `productowner` |
| `domain` | **thematischer** Schnitt | `ai-agents`, `sava`, `aok`, `pflege`, `<projekt>` |
| `sava_cluster` | **Rückreferenz** auf die 5 beim Kunden etablierten Programm-Cluster | `marke-strategie`, `content-redaktion`, `produkt`, `technik`, `compliance` |

Außerdem nutzbar: **Pfad-Prefix** (z.B. `01_Framework/`, `05_Methodik/`) über `kb_list_tree`.

### Die KB-MCP-Tools (Prefix `sava-agent-context__`)
`kb_list_tree` · `kb_read_file` · `kb_get_frontmatter` · `kb_read_multiple` · `kb_search` (GitHub-Code-Search, Index-Lag bei frischen Pushes) · `kb_find_backlinks` · `kb_filter_by_frontmatter`.

---

## 3. Die zentrale Designentscheidung: Übersetzung gehört HIERHER

Auf der KB-Seite wurde bewusst entschieden: **Die KB hält jeden Fakt genau einmal** (Single Source of Truth). Sie speichert **keine** umformulierten Varianten je Zielgruppe. Die **Übersetzung — Ton, Sprachebene, was hervorgehoben wird — macht der Assistent zur Laufzeit über sein Rollenprofil.** In build-jetzt ist dieses Rollenprofil der **System-Prompt eines Experten** (Layer 1 der 7-Layer-Architektur).

Heißt konkret:
- Ein **Experte = eine Zielgruppen-Linse** auf dieselbe KB. Der System-Prompt definiert Rolle, Tonalität, Sprachregister und *welche* KB-Achsen er filtert.
- Echt zielgruppen-spezifische Fakten sind in der KB über `audience` gekennzeichnet (z.B. nur `aok-mitarbeiter` oder nur `queo-team`) — der passende Experte filtert darauf.
- Es gibt **keine** Notwendigkeit, Inhalte in der KB zu duplizieren. Vermeidet das.

---

## 4. Was bei euch schon existiert (Anknüpfen, nicht neu bauen)

- **MCP-Server:** `seeds/mcp-servers/sava.md` (`serverId: sava-agent-context`, `${SAVA_MCP_URL}`/`${SAVA_MCP_TOKEN}`, `instances: [aok-sava]`).
- **Erster Experte:** `seeds/experts/sava-agent-expert.md` — erklärt das Agent-Modell, filtert per `domain: ai-agents`, nutzt `kb_list_tree`/`kb_read_multiple`/`kb_filter_by_frontmatter`. **Das ist die Vorlage.**
- **Mechanik:** Expert-Frontmatter (`mcpServerIds`, `allowedTools`, `skillSlugs`, `temperature`, `modelPreference`) + System-Prompt-Body. Tool-Filterung in `src/app/api/chat/build-tools.ts`. Per-Projekt-Kontext über `projects`/`project_documents` (Layer 5).

---

## 5. Die zwei Ziele → Vorschlag

### Ziel A — Übersetzung je Zielgruppe: **Rollen-Experten**
Eine kleine Familie von Experten, je einer pro Zielgruppe. Gleiche KB, unterschiedliche Linse. Beispiele:

| Experte (Vorschlag) | Rollenprofil (System-Prompt) | KB-Filter |
| --- | --- | --- |
| **SAVA für Entscheider** | knapp, strategisch, Outcome-orientiert, keine Implementierungs-Details | `audience in [fuehrungskraft, entscheider]`, `scope: mission` |
| **SAVA für Konzept/Redaktion** | konzeptionell, mit Methodik & Wording | `audience in [konzepter, redaktion]` |
| **SAVA für Entwicklung/PO** | technisch präzise, mit Pfad-Belegen | `audience in [entwickler, productowner]`, Pfad `06_Entwicklung/`, `03_SAVA-Architektur/` |
| **SAVA Compliance** | rechtssicher, vorsichtig, mit Normverweisen | `sava_cluster: compliance` |

Jeder Experte instruiert das Modell im System-Prompt, **(1)** auf seine `audience`/`sava_cluster`/`domain` zu filtern und **(2)** in seiner Sprachebene/Tonalität zu antworten — das ist die Übersetzung.

### Ziel B — fokussierte Teilbereiche: **Fokus-Experten**
Experten, die einen Teilbereich tief erkunden (statt die ganze KB). Filtern über `sava_cluster` / `domain` / Pfad-Prefix. Beispiele: **Strategie-Experte** (`sava_cluster: marke-strategie`), **Methodik-Buddy** (Pfad `05_Methodik/`), **Architektur-Experte** (`03_SAVA-Architektur/`), **Content-Pipeline-Experte** (`sava_cluster: content-redaktion`).

### Kombination
Zielgruppe × Fokus lässt sich mischen. Für stark projekt-gebundene Erkundung bietet sich zusätzlich der `projects`/`project_documents`-Mechanismus an (Layer 5), wenn ein Projekt seinen eigenen Korpus außerhalb der Mission-KB mitbringt.

---

## 6. Konkrete Anschlusspunkte in eurem Code

1. **Experten-Vorlage:** `seeds/experts/sava-agent-expert.md` (Format + Tool-Strategie kopieren).
2. **Experten-Schema:** `src/lib/db/schema/experts.ts` (Felder `systemPrompt`, `mcpServerIds`, `allowedTools`, `skillSlugs`, `temperature`).
3. **MCP-Server:** `seeds/mcp-servers/sava.md` (schon vorhanden — nicht ändern, nur referenzieren).
4. **Tool-Filterung pro Experte:** `src/app/api/chat/build-tools.ts` (`allowedTools` schränkt die `sava-agent-context__kb_*`-Tools ein).
5. **System-Prompt-Aufbau:** `docs/system/system-prompt-architektur.md` (Layer 1 = Experten-Persona, Layer 2.6 = MCP-Tools, Layer 5 = Projekt-Kontext).
6. **Seeden:** `pnpm db:seed` bzw. `node scripts/expert-md-to-json.mjs <slug>`.

---

## 7. Offene Designfragen (mit Rico klären)

- **Wie viele Experten?** Reine Rollen-Familie (A), reine Fokus-Familie (B), oder eine Matrix? Für den Start lieber 2–3 scharf geschnittene als zehn unscharfe.
- **Filter hart oder weich?** Filtert ihr per `allowedTools` + System-Prompt-Instruktion (Modell *soll* filtern), oder soll der Filter erzwungen sein? `kb_filter_by_frontmatter` macht den Schnitt sauber; ein knappes „du arbeitest ausschließlich mit `audience in […]`" im System-Prompt ist die einfachste Durchsetzung.
- **AOK-only / queo-only Fakten:** Wie soll ein AOK-Experte mit `audience: queo-team`-Inhalten umgehen (gar nicht sehen vs. sehen, aber nicht zitieren)? Die `audience`-Kennzeichnung in der KB ist der Hebel.
- **Übersetzung vs. Treue:** Wie weit darf ein Experte umformulieren, ohne den Fakt zu verfälschen? Compliance-sensibel — verbindliche Auskunft bleibt bei der AOK; der Experte erklärt/übersetzt, erfindet nicht.

---

## 8. Wichtig (Leitplanken)

- **Keine Inhalte in der KB duplizieren** für Zielgruppen — das ist genau das, was die KB-Architektur vermeidet. Übersetzung lebt im Experten-System-Prompt.
- **Belege mit Pfad-Verweis**, was nicht im Korpus steht als Lücke benennen (so macht es `sava-agent-expert` bereits).
- **`kb_search`** hat bei frischen KB-Pushes 24–72 h GitHub-Index-Lag; `kb_list_tree`/`kb_read_*`/`kb_filter_by_frontmatter` greifen sofort.
