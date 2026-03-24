# Roadmap: Ausbaustufen nach M10

> Konsolidierte Planung fuer alle offenen Features. Priorisiert nach Nutzer-Mehrwert und Risiko.
> Einzelne PRDs in `docs/features/` bleiben als Detail-Referenz erhalten.

---

## Plattform-Status

Alle 10 Original-Meilensteine plus Post-M10-Erweiterungen sind abgeschlossen.

### Abgeschlossene Meilensteine

| #    | Meilenstein      | Kern-Features                                |
| ---- | ---------------- | -------------------------------------------- |
| M1   | Foundation       | Auth (Logto), Chat-Persistenz, Basic UI      |
| M2   | Chat Features    | Streaming, Model Selection, Empty State      |
| M3   | Artifact System  | HTML, Markdown, Code Rendering + Editor      |
| M4   | Experts & Skills | 7 Experten, Skill-System, Quicktasks         |
| M4.5 | Admin & Web      | Admin-UI, Web Search/Fetch (Firecrawl)       |
| M5   | File Upload      | 10MB Pre-Signed R2 Upload, Multimodal        |
| M6   | Projects         | Gebundelte Chats mit Kontext-Dokumenten      |
| M7   | MCP Integration  | Externe Tool-Server (GitHub, Slack etc.)     |
| M8   | Memory           | Mem0 Cloud, Auto-Extraktion, Semantic Search |
| M9   | Business Mode    | PII-Erkennung, EU-Routing, Consent-Logging   |
| M10  | Credits          | Token-basierte Abrechnung, Admin-Vergabe     |

### Post-M10 (bereits umgesetzt)

| Feature                 | Beschreibung                                      |
| ----------------------- | ------------------------------------------------- |
| Image Generation        | Gemini Bildgenerierung mit Iterations-Galerie     |
| Admin Roles             | DB-basiertes Rollensystem (user/admin/superadmin) |
| Sidebar Infinite Scroll | Automatisches Nachladen beim Scrollen             |
| Chat Retention Cron     | Automatische Loesch-Policy fuer alte Chats        |
| Adaptive Thinking       | Extended Thinking fuer Anthropic-Modelle          |
| Landing Page            | Feature-Uebersicht mit Beta-CTA                   |

---

## Offene PRDs: Status-Audit

| PRD                    | Fertig | Offen                                         | Referenz                             |
| ---------------------- | ------ | --------------------------------------------- | ------------------------------------ |
| Admin Roles            | 100%   | —                                             | `prd-admin-roles.md`                 |
| Generative UI Tools    | 100%   | —                                             | `generative-ui-tools-guide.md`       |
| Gemini Features        | 60%    | YouTube, TTS, Search Grounding                | `prd-gemini-features.md`             |
| Anthropic Agent Skills | 0%     | Code Execution, PPTX/XLSX/DOCX/PDF, Files API | `PRD-anthropic-agent-skills.md`      |
| Performance/Caching    | 80%    | Message-Pagination, Virtualisierung           | `performance-caching-concept.md`     |
| Privacy/Family         | 50%    | EU-Config, DSGVO-Export                       | `privacy-family-deployment-guide.md` |
| Notes/Second Brain     | 0%     | Komplettes Feature                            | `prd-notes-second-brain-v2.md`       |
| lernen.diy             | 30%    | Content-Pipeline, Lernbegleiter               | `prd-lernen-diy-v1.md`               |

---

## Ausbaustufen

### Stufe 1: Plattform-Haertung

> Bestehende Features robuster machen. Keine neuen Abhaengigkeiten.

| Feature                   | Beschreibung                                                       | Quelle          | Status |
| ------------------------- | ------------------------------------------------------------------ | --------------- | ------ |
| Message-Limit (50)        | Chat laedt nur letzte 50 Messages, aeltere on-demand               | Performance PRD | Done   |
| Artifact Lazy Loading     | Artifact-Komponenten per `next/dynamic` geladen                    | Performance PRD | Done   |
| Expert/Projekt Enrichment | API liefert Namen direkt mit, keine Extra-Fetches                  | Performance PRD | Done   |
| Chat umbenennen           | Inline-Rename im Sidebar-Dropdown                                  | Neu             | Done   |
| Chat teilen               | Token-basierter Share-Link, read-only, widerrufbar, ohne Login     | Neu             | Offen  |
| EU-Deployment-Checkliste  | Dokumentation fuer Neon EU, Vercel fra1, ENV-Vorlage               | Privacy PRD     | Offen  |
| DSGVO-Datenexport         | User exportiert eigene Daten als JSON (Chats, Artifacts, Memories) | Privacy PRD     | Offen  |

**Aufwand:** 1-2 Tage (verbleibend: Share + Compliance)
**Risiko:** Minimal
**Mehrwert:** Performance, UX, Sharing-Faehigkeit

---

### Stufe 2: YouTube + TTS

> Gemini-Erweiterung um die zwei meistgewuenschten Features.

| Feature                 | Beschreibung                                                     | Quelle     |
| ----------------------- | ---------------------------------------------------------------- | ---------- |
| YouTube Transcription   | Tool `youtube_transcript`: URL → Transkript/Zusammenfassung      | Gemini PRD |
| Text-to-Speech          | Tool `text_to_speech`: Audio-Generierung inkl. 2-Speaker-Podcast | Gemini PRD |
| Google Search Grounding | Optional: Faktencheck ueber Gemini Search (Scope offen)          | Gemini PRD |

**Aufwand:** 2-3 Tage
**Risiko:** Niedrig — isolierte Tools, kein Eingriff in Core-Chat
**Mehrwert:** Hoch — YouTube und TTS sind persoenliche Top-Prioritaeten
**Abhaengigkeit:** `GOOGLE_GENERATIVE_AI_API_KEY` (bereits vorhanden)

---

### Stufe 3: Anthropic Agent Skills

> Dokument-Generierung direkt im Chat. PPTX, XLSX, DOCX, PDF ueber Anthropic Code Execution.

| Feature              | Beschreibung                                                    | Quelle                   |
| -------------------- | --------------------------------------------------------------- | ------------------------ |
| Code Execution Tool  | `code_execution` fuer Anthropic-Modelle registrieren            | Agent Skills PRD Phase 1 |
| Skills-Config        | Standard-Skills (pptx, xlsx, docx, pdf) + Custom Skills per ENV | Agent Skills PRD Phase 1 |
| Files API Proxy      | `/api/files/[fileId]` Route zum Download generierter Dateien    | Agent Skills PRD Phase 1 |
| Download-Card        | Neue `FileDownloadCard` Komponente fuer Binaer-Formate im Chat  | Agent Skills PRD Phase 2 |
| PDF Artifact         | PDF-Preview im ArtifactPanel, R2-Persistenz                     | Agent Skills PRD Phase 3 |
| Multi-Turn Container | Container-ID zwischen Steps weiterleiten (`prepareStep`)        | Agent Skills PRD Phase 1 |

**Aufwand:** 3-4 Tage
**Risiko:** Mittel — Beta-APIs, Gateway-Kompatibilitaet muss getestet werden
**Mehrwert:** Hoch — Dokument-Generierung ist ein Killer-Feature (PowerPoint, Excel, PDF)
**Einschraenkung:** Nur mit Anthropic-Modellen, nicht ZDR-faehig (kein Privacy-Routing)
**Detail-PRD:** `docs/PRD-anthropic-agent-skills.md`

---

### Stufe 4: Notes System

> Persoenliches Wissensmanagement. Grundlage fuer lernen.diy.

| Phase                 | Beschreibung                                                            | Quelle              |
| --------------------- | ----------------------------------------------------------------------- | ------------------- |
| Phase 1: Schema + API | `notes` Tabelle, Tags, CRUD-Routes, Feature-Flag                        | Notes PRD Phase 1-2 |
| Phase 2: UI           | Notes-Seite, CodeMirror-Editor, Tag-Autocomplete, Sidebar-Link          | Notes PRD Phase 3   |
| Phase 3: AI-Tools     | `search_notes`, `read_note`, `create_note`, `update_note`, `list_notes` | Notes PRD Phase 4   |

**Aufwand:** 3-4 Tage
**Risiko:** Mittel — neues DB-Schema, aber isoliert vom Chat-Core
**Mehrwert:** Hoch — persoenliche Wissensbasis, strategisch fuer lernen.diy
**Detail-PRD:** `docs/features/prd-notes-second-brain-v2.md`

---

### Stufe 5: lernen.diy Launch

> Erste oeffentliche Lern-Instanz. Abhaengig von Stufe 4 (Notes).

| Feature              | Beschreibung                                                  | Quelle                 |
| -------------------- | ------------------------------------------------------------- | ---------------------- |
| Content-Pipeline     | Brainsidian → Skills-Transformation (30-40 Skills)            | lernen.diy PRD Phase 1 |
| Lernbegleiter-Expert | Didaktischer System-Prompt, aktive Lernfortschritt-Verfolgung | lernen.diy PRD Phase 2 |
| Skill-basierte UX    | Lernpfade ueber Quicktasks, Curriculum-Struktur               | lernen.diy PRD Phase 3 |
| Lern-Notizbuch       | Notes als persoenliches Lerntagebuch (Stufe 3 Voraussetzung)  | lernen.diy PRD Phase 4 |

**Aufwand:** 5-7 Tage
**Risiko:** Mittel — Content-Qualitaet entscheidend, technisch auf bestehender Infrastruktur
**Mehrwert:** Neues Produkt — eigenstaendige Lern-Plattform
**Blocker:** Stufe 4 (Notes System)
**Detail-PRD:** `docs/features/prd-lernen-diy-v1.md`

---

### Stufe 6: Monetarisierung + Skalierung

> Plattform fuer zahlende Nutzer vorbereiten.

| Feature                | Beschreibung                                       | Quelle          |
| ---------------------- | -------------------------------------------------- | --------------- |
| Stripe-Integration     | Abo-Tiers mit Credit-Kontingenten, Checkout-Flow   | Neu             |
| Usage-Dashboard        | Nutzer sieht eigenen Verbrauch, Kosten-Transparenz | Neu             |
| Redis-Cache            | Verteilter Cache fuer Multi-Instance-Betrieb       | Performance PRD |
| Client-Virtualisierung | react-window fuer lange Chat-Historien             | Performance PRD |

**Aufwand:** 5-7 Tage
**Risiko:** Hoeher — Payment-Integration, Infrastruktur-Aenderungen
**Mehrwert:** Revenue-Faehigkeit, Skalierbarkeit

---

## Bewusst offen gelassen

| Feature                   | Grund                                                      |
| ------------------------- | ---------------------------------------------------------- |
| Direct Anthropic Provider | AI Gateway bleibt primaer. Kein akuter Bedarf fuer Bypass. |
| Speech-to-Text            | Geringe Prioritaet, kein akuter Einsatz.                   |
| Redis-Cache (Phase 1-5)   | Module-Level-Cache reicht fuer aktuelle Last.              |

---

## Referenzen

| Dokument                   | Pfad                                               |
| -------------------------- | -------------------------------------------------- |
| Original-PRD               | `docs/PRD-ai-chat-platform.md`                     |
| Technische Architektur     | `docs/technical-architecture.md`                   |
| Feature-Flags              | `docs/feature-flags-konfiguration.md`              |
| Admin-Handbuch             | `docs/admin-handbuch.md`                           |
| Gemini PRD                 | `docs/features/prd-gemini-features.md`             |
| Notes PRD                  | `docs/features/prd-notes-second-brain-v2.md`       |
| lernen.diy PRD             | `docs/features/prd-lernen-diy-v1.md`               |
| Performance-Konzept        | `docs/features/performance-caching-concept.md`     |
| Privacy-Guide              | `docs/features/privacy-family-deployment-guide.md` |
| Anthropic Agent Skills PRD | `docs/PRD-anthropic-agent-skills.md`               |
