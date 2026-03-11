# Plan: Multi-Format Artifact Panel (Document + Carousel via Anthropic Skills)

> Erarbeitet am 2. Maerz 2026. Noch nicht umgesetzt.

## Hintergrund der Idee

Der Assistant hat einen "Als Dokument ausgeben"-Toggle, der AI-Output als Markdown im Artifact-Panel rendert. Die Idee: Verschiedene **Ausgabeformate** waehlbar machen. Neben Dokumenten auch LinkedIn Carousels generieren und direkt im Artifact-Panel als Vorschau anzeigen.

Die Carousel Factory (`docs/carousel-factory/`) existiert bereits als Claude Desktop Skill mit 14 Slide-Typen, ~40 Varianten und Corporate-Design-konformem CSS/HTML.

## Diskussion: System-Prompt vs. Anthropic Custom Skills

Zwei Ansaetze wurden evaluiert:

### Option A: System-Prompt Injection
- Alle Carousel-Docs (~60KB, ~20K Tokens) in den System-Prompt injizieren wenn format=carousel
- AI streamt HTML als Text, progressives Rendering im Artifact-Panel
- **Pro:** Simpler, Streaming-Preview, keine externe Abhaengigkeit
- **Contra:** AI reproduziert CSS aus dem Gedaechtnis (fehleranfaellig), hoher Token-Verbrauch pro Request

### Option B: Anthropic Custom Skill (GEWAEHLT)
- Carousel Factory als Custom Skill ueber Anthropic Skills API hochladen
- Claude nutzt Code Execution Container: schreibt Python, liest CSS/Templates aus echten Dateien, generiert HTML programmatisch
- **Pro:** CSS kommt aus Originaldateien (Qualitaetssicherung), Progressive Context Loading (kein Prompt-Bloat), programmatische Validierung moeglich
- **Contra:** Beta-Status, File-Output statt Streaming (Carousel erscheint komplett am Ende), Code-Execution-Latenz

**Entscheidung:** Option B wegen besserer Qualitaetssicherung. Die Corporate-Design-abgenommenen Slide-Typen mit exakten CSS-Klassen und Dimensionen sollen aus den Originaldateien gelesen werden, nicht aus dem AI-Gedaechtnis reproduziert.

## Technische Grundlagen: Anthropic Agent Skills

- Skills laufen in sandboxed Code Execution Containern
- Claude schreibt Python/Bash → Code laeuft im Container → generierte Files werden zurueckgegeben
- Built-in Skills: pptx, docx, pdf, xlsx
- Custom Skills: `SKILL.md` mit YAML-Frontmatter + References/Assets hochladen
- AI SDK Integration: `anthropic.tools.codeExecution_20250825()` + `providerOptions.anthropic.container.skills`
- `streamText` unterstuetzt Skills: Text streamt normal, File kommt als `GeneratedFile` (base64) am Ende
- Docs: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic#agent-skills

---

## Implementierungsplan

### Phase 1: Skill vorbereiten und hochladen

#### 1.1 Verzeichnisstruktur fuer Skill-Upload

Die aktuelle flache Struktur in `docs/carousel-factory/` wird fuer den API-Upload reorganisiert. Neues Verzeichnis: `docs/carousel-factory-skill/`

```
carousel-factory-skill/
├── SKILL.md                    ← Angepasst fuer Code Execution
├── references/                 ← Slide-Typ Specs (.md)
│   ├── titel-slides.md
│   ├── quote-slides.md
│   ├── stat-slides.md
│   ├── fazit-slides.md
│   ├── def-slides.md
│   ├── cta-slides.md
│   ├── list-slides.md
│   ├── compare-better.md
│   ├── myth-reality.md
│   ├── trap-solution.md
│   ├── usecase-prompt.md
│   ├── prompt-focused.md
│   ├── statement-context.md
│   └── series-overview.md
├── assets/                     ← CSS + HTML Templates
│   ├── _base.css
│   ├── _brands.css
│   ├── _export-panel.html
│   ├── titel-slides.html
│   ├── quote-slides.html
│   └── ... (alle .html Templates)
```

#### 1.2 SKILL.md anpassen

Die bestehende SKILL.md hat bereits korrektes YAML-Frontmatter (`name: carousel-factory`, `description: ...`). Anpassungen noetig:

- **Brainsidian-Referenzen entfernen** — Im Container gibt es kein MCP. Stattdessen: "Farben und Brand-CSS aus `assets/_base.css` und `assets/_brands.css` lesen"
- **Code-Execution-Instruktionen ergaenzen** — Neuer Abschnitt der beschreibt wie Claude Python schreiben soll um die HTML-Datei zu generieren:
  1. CSS aus `assets/_base.css` (+ `assets/_brands.css` fuer Brand-Wechsel) lesen
  2. Slide-Specs aus `references/[name].md` lesen
  3. HTML-Templates aus `assets/[name].html` als Referenz nutzen
  4. Slides programmatisch zusammenbauen (CSS einbetten, Fonts verlinken)
  5. Export-Panel aus `assets/_export-panel.html` einbinden
  6. Als `carousel.html` speichern

#### 1.3 Upload-Script

```bash
cd docs/carousel-factory-skill
zip -r ../carousel-factory-skill.zip .
curl "https://api.anthropic.com/v1/skills" \
  -X POST \
  -H "X-Api-Key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F "display_title=Carousel Factory" \
  -F "files[]=@../carousel-factory-skill.zip"
```

Die zurueckgegebene `skill_id` wird als `CAROUSEL_SKILL_ID` in `.env.local` gespeichert.

---

### Phase 2: Types und Config

#### 2.1 Neuer Type: `ArtifactFormat`

**Neue Datei:** `src/types/artifact.ts`

```typescript
export type ArtifactFormat = "none" | "document" | "carousel"

export const ARTIFACT_FORMATS: Record<Exclude<ArtifactFormat, "none">, {
  id: ArtifactFormat
  label: string
  description: string
  contentType: "text/markdown" | "text/html"
  fileExtension: string
}> = {
  document: {
    id: "document", label: "Dokument",
    description: "Strukturierter Markdown-Text",
    contentType: "text/markdown", fileExtension: "md",
  },
  carousel: {
    id: "carousel", label: "Carousel",
    description: "LinkedIn Carousel (HTML Slides)",
    contentType: "text/html", fileExtension: "html",
  },
}
```

#### 2.2 Config + Schema + Feature Flag

- `src/config/assistants.ts`: `carouselSkillId`, `carouselMaxTokens: 16384`
- `src/lib/schemas.ts`: `format` Feld in `assistantChatBodySchema`
- `src/config/features.ts`: `carousel: { enabled: !!process.env.CAROUSEL_SKILL_ID }`

---

### Phase 3: Format-Picker UI

**Neue Datei:** `src/components/assistant/format-picker.tsx`

- Ersetzt den einzelnen "Als Dokument ausgeben" Toggle-Button
- Popover-Pattern analog zu `expert-picker.tsx`
- Zeigt verfuegbare Formate (Dokument + Carousel wenn Feature aktiv)
- Aktives Format wird durch Icon-Wechsel und Farbhighlight angezeigt

**assistant-chat.tsx Aenderungen:**
- `canvasMode: boolean` → `selectedFormat: ArtifactFormat`
- `turnCanvas: boolean[]` → `turnFormat: ArtifactFormat[]`
- Format wird im Request-Body mitgesendet
- ArtifactState bekommt `format` Feld

---

### Phase 4: API-Route fuer Skills

**Datei:** `src/app/api/assistant/chat/route.ts`

Wenn `format === "carousel"`:
- Code Execution Tool hinzufuegen: `anthropic.tools.codeExecution_20250825()`
- Custom Skill in providerOptions: `container.skills` mit `carouselSkillId`
- Token-Limit erhoehen auf `carouselMaxTokens`

Wenn `format === "document"` oder `"none"`:
- Verhalten bleibt wie bisher

---

### Phase 5: File-Output im Frontend verarbeiten

In `assistant-messages.tsx`:
- Wenn `turnFormat[turnIndex] === "carousel"`, nach File-Parts (`part.type === "file"`, `mediaType: "text/html"`) suchen
- base64-File zu HTML-String decodieren
- ArtifactCard mit format="carousel" rendern

In `assistant-chat.tsx`:
- Auto-Open: Sobald File-Part ankommt, Artifact-Panel oeffnen
- Artifact-Content ist der decodierte HTML-String

---

### Phase 6: Artifact-Panel fuer Carousel

#### 6.1 Carousel-Preview Komponente

**Neue Datei:** `src/components/assistant/carousel-preview.tsx`

- Rendert Carousel-HTML in sandboxed iframe (`srcdoc`, `sandbox="allow-same-origin"`)
- Slides vertikal gestapelt, skaliert auf Panel-Breite
- Dark Background (`bg-neutral-900`) fuer visuelle Kontinuitaet

#### 6.2 Artifact-Panel Erweiterungen

**Datei:** `src/components/assistant/artifact-panel.tsx`

| Modus | Dokument | Carousel |
|-------|----------|----------|
| View | MessageResponse (Streamdown) | CarouselPreview (iframe) |
| Edit | CodeMirror markdown() | CodeMirror html() |
| Download | .md + PDF print | .html + PDF via iframe print |
| Copy | Markdown-Text | Raw HTML |

#### 6.3 Weitere Komponenten

- `artifact-card.tsx`: format-Prop, Icon-Wechsel (FileText vs GalleryHorizontalEnd)
- `artifact-utils.ts`: `extractCarouselTitle()`, HTML-Support in Preview/Summary
- `artifact-editor.tsx`: language-Prop fuer CodeMirror

---

### Phase 7: CSP und Cleanup

**Datei:** `next.config.ts`

CSP erweitern fuer Google Fonts im iframe:
- `font-src`: `https://fonts.gstatic.com`
- `style-src`: `https://fonts.googleapis.com`

---

## Alle betroffenen Dateien

### Neue Dateien
| Datei | Zweck |
|-------|-------|
| `src/types/artifact.ts` | ArtifactFormat Type, Format-Config |
| `src/components/assistant/format-picker.tsx` | Format-Auswahl Popover |
| `src/components/assistant/carousel-preview.tsx` | Iframe-basierte Carousel-Vorschau |
| `docs/carousel-factory-skill/` | Reorganisierte Skill-Directory |
| `scripts/upload-carousel-skill.sh` | Upload-Script |

### Modifizierte Dateien
| Datei | Aenderungen |
|-------|-------------|
| `src/components/assistant/assistant-chat.tsx` | Format-State, File-Part Handling, ArtifactState.format |
| `src/components/assistant/assistant-messages.tsx` | turnFormat, File-Part Erkennung |
| `src/components/assistant/artifact-panel.tsx` | Format-Prop, bedingte Rendering + Export |
| `src/components/assistant/artifact-card.tsx` | Format-Prop, dynamisches Icon |
| `src/components/assistant/artifact-utils.ts` | Carousel-Title, HTML-Support |
| `src/components/assistant/artifact-editor.tsx` | language-Prop |
| `src/app/api/assistant/chat/route.ts` | Code Execution + Skills |
| `src/config/assistants.ts` | carouselSkillId, carouselMaxTokens |
| `src/config/features.ts` | carousel Feature Flag |
| `src/lib/schemas.ts` | format Feld |
| `next.config.ts` | CSP fuer Google Fonts |

---

## Verifizierung

1. **Skill-Upload:** Script ausfuehren, skill_id zurueck, in .env.local eintragen
2. **Format-Picker:** Popover oeffnet, Carousel waehlbar, Highlight korrekt
3. **Carousel-Generierung:** Nachricht senden → AI-Text + Code-Execution → File kommt → Panel oeffnet → Carousel korrekt gerendert
4. **Export:** HTML download funktioniert, PDF drucken oeffnet Dialog
5. **Dokument-Regression:** Dokument-Format verhaelt sich wie bisher
6. **Ohne Skill-ID:** Carousel-Option nicht im Picker sichtbar

---

## Risiken

| Risiko | Mitigation |
|--------|-----------|
| Skills Beta-Status | Feature Flag — nur sichtbar wenn CAROUSEL_SKILL_ID gesetzt |
| Code Execution Latenz | Loading-State im Artifact-Panel |
| File-Part in useChat | Testen ob toUIMessageStreamResponse() Files korrekt weitergibt |
| CSP blockiert Fonts im iframe | Fallback auf System-Fonts (akzeptabel) |
| Gateway + Skills Kompatibilitaet | Falls noetig: direkt anthropic() Provider fuer Carousel |
