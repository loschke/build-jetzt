# SAVA-Experten & -Skills v2 — Redesign gegen die aktuelle Knowledgebase

> **Adressat:** Rico Loschke + queo/AOK-Projektteam
> **Erstellt:** 2026-06-23, build-jetzt-Agent
> **Supersedes:** `docs/ideas/sava-experts-briefing.md` und `docs/ideas/sava-experts-proposal.md` (v1, 2026-04-30, gegen frühe KB-Version)
> **Auslöser:** Übergabe `docs/sava-kb-uebergabe.md` (KB-Seite) + Rico-Freigabe, die Alt-Experten komplett zu überholen.

---

## TL;DR

Die fünf SAVA-Experten in build.jetzt stammen aus einer frühen KB-Version und sind veraltet (Tool-Strategie, keine `audience`-Nutzung, Drift zur KB-Scope-Map). Die KB hat sich weiterentwickelt: vier dicht gepflegte Frontmatter-Achsen (`scope`, `audience`, `domain`, `sava_cluster`), dokumentiert in `README.md` + `00_Mission/Scope-Map.md`.

**Neu:** eine schlanke Familie aus **6 Experten** (1 Generalist + 3 Audience-Linsen + 1 Compliance-Linse + 1 Discovery-Prozess) plus **2 Skills** (`sava-kb-recherche`, `sava-zielgruppen-uebersetzung`). Übersetzung je Zielgruppe lebt im Experten-System-Prompt, nicht als KB-Duplikat. Integration manuell über die Admin-UI (Experten als JSON, Skills als `.md`).

**Zielgruppe:** ausschließlich projekt-interne Rollen (queo + AOK). Keine Versicherten als Nutzer — Außenkommunikation wird über den Übersetzungs-Skill *erarbeitet*, ist aber kein eigener Experte.

---

## 1. Verifizierter KB-Stand (Stand 2026-06-23)

Geprüft direkt im KB-Repo `sava-agent-context` (= dieselbe Quelle wie der MCP).

- **Vier orthogonale Achsen, real & dicht gepflegt** (115 Files):

  | Achse | Werte |
  | --- | --- |
  | `scope` | `mission` · `projekt:<name>` |
  | `audience` | queo-team, aok-mitarbeiter, fuehrungskraft, entscheider, praktiker, konzepter, redaktion, compliance, entwickler, productowner |
  | `domain` | ai-agents, sava, aok, `<projekt>` (offen) |
  | `sava_cluster` | marke-strategie, content-redaktion, produkt, technik, compliance |

- **audience-Dichte** (Vorkommen, grob): redaktion, queo-team, entwickler, aok-mitarbeiter, konzepter, productowner, compliance hoch; fuehrungskraft, entscheider, praktiker dünner. → Audience-Linsen tragfähig, am besten kombiniert.
- **Ordnerstruktur:** `00_Mission`, `01_Framework`, `02_AOK-Kontext`, `03_SAVA-Architektur`, `04_Kommunikation`, `05_Methodik`, `06_Entwicklung`, `90_Projekte`, `99_Archiv`.
- **Bewusst ignoriert:** Die Bausteine-/Fachwissen-Variante (`cluster`/`granularity`/`zielgruppe`, `06_Entwicklung/.../A1-Frontmatter-Schema.md`, Samples) ist ein Relikt für endnutzer-gerichtetes Faktenwissen. Laut Rico nicht Ziel dieser Familie; wird ggf. aus der KB aufgeräumt. Projektgebundenes Wissen (Pflegeassistent etc.) gehört in die **build.jetzt-Projects-Funktion**, nicht in die Mission-KB.

---

## 2. Designentscheidungen

1. **Eine Linse je System-Prompt, eine KB.** Übersetzung (Ton, Sprachebene, Betonung) passiert zur Laufzeit im Experten-Prompt. Keine Inhalts-Duplikate in der KB.
2. **Filter ist soft (prompt-enforced).** `allowedTools` filtert Tool-*Namen* (exakt-Match gegen präfixierte MCP-Namen, `build-tools.ts:183`), nicht Frontmatter-Werte. Deshalb bleibt `allowedTools` **leer** (= alle Tools); der Scope-Schnitt steht als Instruktion im Prompt. (Konsequenz aus der Pitfall: bare `kb_*`-Namen in `allowedTools` filtern alle MCP-Tools weg.)
3. **Tool-Disziplin & Belegpflicht zentral im Skill** `sava-kb-recherche` statt copy-paste je Prompt. Primär `kb_filter_by_frontmatter`/`kb_search`, Pfad-Heuristik als Fallback. Jede Aussage mit Inline-Pfad-Beleg; Lücken benennen.
4. **queo/AOK-Rollen-Leitplanke.** Beide Gruppen projekt-intern; AOK-gerichtete Linsen sparen queo-internes Build-Material (`06_Entwicklung/LLM-Grundlagen.md`) aus und respektieren `sensitivity`. Verbindliche fachliche/rechtliche Auskunft bleibt bei der AOK.
5. **Audience × Folder-Anker.** Jede Linse ist zusätzlich an konkrete Folder/Cluster verankert, damit sie gut „gefüttert" ist — kein dünner Reinaudience-Filter.

---

## 3. Die Familie

### Experten

| Slug | Linse / Modus | KB-Filter (soft) | sortOrder |
| --- | --- | --- | --- |
| `sava-lotse` | Generalist + Router | `scope: mission`, voller Korpus | 20 |
| `sava-fuehrung` | Strategisch, Outcome/Risiko (Entscheider/Führung) | `audience in [entscheider, fuehrungskraft]` + `sava_cluster: marke-strategie` | 21 |
| `sava-konzept-redaktion` | Wording/Transparenz/Kommunikation; Außenkomm mit ab | `audience in [konzepter, redaktion]` + `04_Kommunikation/` | 22 |
| `sava-technik` | Agent-Modell + Architektur + Patterns (Entwickler/PO) | `audience in [entwickler, productowner]` + `01_Framework/`, `03_SAVA-Architektur/`, `06_Entwicklung/` | 23 |
| `sava-compliance` | Recht, Datenschutz, Risiko-Zonierung | `sava_cluster: compliance` / `audience: compliance` | 24 |
| `sava-discovery` | Neue Teilprojekte evaluieren — sokratisch, Phase-0 | `05_Methodik/` | 25 |
| `sava-agent-trace` | *(behalten)* internes Diagnose-Werkzeug | `scope: mission` | 26 |

### Skills

| Slug | Zweck |
| --- | --- |
| `sava-kb-recherche` | `kb_*`-Tool-Playbook, 4-Achsen-Filter, Belegpflicht, Lücken-Disziplin. Von allen SAVA-Experten via `skillSlugs` geladen. |
| `sava-zielgruppen-uebersetzung` | Belegte Fakten ins Register einer Zielgruppe übersetzen (treu zum Fakt). Trägt auch die Außenkommunikation. |

---

## 4. Provenance — woraus jeder Experte schöpft (Belegfähigkeit)

| Experte | Primäre KB-Quellen |
| --- | --- |
| `sava-lotse` | `_MOC.md`, `00_Mission/Vision-2030.md`, `Projekt-Typen.md`, `Branding-Strategie.md`, `Glossar.md`, `Stakeholder-Map.md`, `Scope-Map.md` |
| `sava-fuehrung` | `00_Mission/Vision-2030.md`, `Projekt-Typen.md`, `Branding-Strategie.md`, `01_Framework/09_wann-lohnt-sich-was.md`, `00_Mission/Stakeholder-Map.md`, `03_SAVA-Architektur/Risiko-Zonierung.md` |
| `sava-konzept-redaktion` | `04_Kommunikation/Wording-Guide.md`, `SAVA_Transparenz-Strategie.md`, `AOK-Kommunikationsregeln.md`, `AOK-Glossar.md`, `Case-for-Change.md`, `00_Mission/Stakeholder-Map.md`, `01_Framework/05_stimme.md` |
| `sava-technik` | `01_Framework/02_gesamtmodell.md`–`07_pruefstand.md`, `03_SAVA-Architektur/_MOC-Klassifikationen.md` + `Sensor-*`/`Motor-*`/`Stimme-*`/`Kompass.md`/`Risiko-Zonierung.md`/`LLM-Hosting-Optionen.md`, `06_Entwicklung/_MOC-Entwicklung.md` + `Wissensmanagement/*` |
| `sava-compliance` | `02_AOK-Kontext/Regulatorischer-Rahmen-KI.md`, `03_SAVA-Architektur/Risiko-Zonierung.md`, `05_Methodik/G_Compliance-Pre-Check.md`, `01_Framework/06_kompass.md`, `04_Kommunikation/SAVA_Transparenz-Strategie.md` |
| `sava-discovery` | `05_Methodik/_MOC-Methodik.md`, `A_Projekt-Steckbrief.md` … `G_Compliance-Pre-Check.md` (+ `_Template.md`), `03_SAVA-Architektur/Cluster-Konfigurations-Blaupause.md` |

---

## 5. Retirement / Konsolidierung

| Alt-Experte | Verbleib |
| --- | --- |
| `sava-mission-expert` | → `sava-lotse` |
| `sava-agent-expert` | → `sava-technik` |
| `sava-methodik-buddy` | → `sava-discovery` (Prozess) + `sava-konzept-redaktion` (Register) |
| `sava-pflegeassistent-coach` | entfernt — Projektwissen → build.jetzt-Projects |
| `sava-implementation-advisor` (nur JSON) | Modus A → `sava-technik`; Modus B (`90_Projekte`-Stack) entfällt |
| `sava-agent-trace` | behalten; `allowedTools`-Bug gefixt, sortOrder 24→26, tote Sensor-Pfade korrigiert |

Quellen (`seeds/experts/*.md`) und Import-JSONs (`imports/experts/*.json`) der entfernten Experten gelöscht. Bereits in der DB importierte Alt-Experten in `/admin/experts` deaktivieren (Datei-Löschung räumt die DB nicht auf).

---

## 6. Integration (manuell, kein `pnpm db:seed`)

- **Skills:** `seeds/skills/sava-{kb-recherche,zielgruppen-uebersetzung}.md` → Import als `.md` über `/admin/skills`.
- **Experten:** `seeds/experts/sava-*.md` → `node scripts/expert-md-to-json.mjs <slugs>` → `imports/experts/sava-*.json` → Import als JSON über `/admin/experts`.
- `mcpServerIds: [sava-agent-context]`, `allowedTools: []`, `skillSlugs: [sava-kb-recherche, sava-zielgruppen-uebersetzung]`, `temperature: 0.4`, `modelPreference: anthropic/claude-sonnet-4-6`.

---

## 7. Test (nach Import)

Pro Experte 2–3 echte Chats. Beobachten: greift `sava-kb-recherche` (Tool-Reihenfolge, 4-Achsen-Filter)? Richtige Files? Inline-Pfad-Belege? Register passt zur Zielgruppe? queo-internes bei AOK-Linse ausgespart? Routing zu Geschwistern korrekt? Kurz-Report nach `docs/ideas/sava-experts-v2-test-report.md`.

---

## 8. Offene Punkte

- **Außenkommunikation** als On-demand-Output über `sava-zielgruppen-uebersetzung` (kein eigener Experte) — bestätigt.
- **Projektwissen → build.jetzt-Projects** (Layer 5) als eigener Folge-Schritt scopen.
- **Experten-Anzahl-Hebel:** 6 ist der Vorschlag; `sava-fuehrung` ließe sich in `sava-lotse` falten (→ 5), falls schlanker gewünscht.
- **`sava-agent-trace`** als internes Tool ggf. in der UI ausblenden (Sichtbarkeit), falls nicht für Endnutzer gedacht.
