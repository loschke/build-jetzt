# Aufgabe: App Skeleton um AI-Stack erweitern

Du arbeitest am `sevenx-app-boilerplate` — einem wiederverwendbaren Next.js 16 Boilerplate fuer AI-gestuetzte Applikationen. Das Boilerplate wird geklont und als Ausgangspunkt fuer verschiedene Projekte genutzt.

Das Skeleton hat bereits: Next.js 16, Vercel AI SDK, shadcn/ui, Tailwind CSS v4, Logto Auth, Drizzle ORM, ein Chat-System mit Streaming. Es nutzt aktuell `react-markdown` + `remark-gfm` fuer Markdown-Rendering.

Ziel: Das Skeleton um drei Bausteine erweitern, damit zukuenftige Projekte eine bessere Grundlage fuer AI-native UIs haben.

---

## 1. Streamdown installieren und einrichten

**Was:** Streamdown ist ein Drop-in-Replacement fuer `react-markdown`, gebaut fuer AI-Streaming. Es loest Probleme mit unvollstaendigem Markdown waehrend des Streamings (offene Bold-Tags, fehlende Backticks, kaputte Links) und bringt Mermaid-Rendering als Plugin mit.

**Pakete installieren:**

```bash
npm i streamdown @streamdown/code @streamdown/mermaid
```

**`react-markdown` und `remark-gfm` entfernen:**

```bash
npm uninstall react-markdown remark-gfm
```

**`globals.css` anpassen:**

Die Tailwind-Source-Direktive fuer Streamdown ergaenzen. Direkt nach den bestehenden `@import` Zeilen (vor `@theme inline`):

```css
@source "../node_modules/streamdown/dist/*.js";
```

**Chat-Panel migrieren:**

Im Chat-Panel (`src/components/chat/chat-panel.tsx` oder wo Markdown gerendert wird) den Import von `react-markdown` durch `streamdown` ersetzen:

```tsx
// ALT
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>

// NEU
import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import { mermaid } from "@streamdown/mermaid"

<Streamdown
  plugins={{ code, mermaid }}
  isAnimating={isStreaming}
>
  {content}
</Streamdown>
```

Der `isAnimating` Prop signalisiert Streamdown, dass der Content noch streamt. Setze ihn auf `true` waehrend der AI-Stream laeuft. Damit werden Mermaid-Diagramme erst gerendert wenn der Code-Block vollstaendig ist (kein Flackern) und interaktive Elemente sind waehrend des Streamings deaktiviert.

**Wichtig:** Pruefe alle Stellen im Projekt die `react-markdown` importieren und migriere sie. Nach der Migration darf kein Import von `react-markdown` oder `remark-gfm` mehr existieren.

---

## 2. AI Elements installieren

**Was:** Vercel AI Elements ist eine Komponentenbibliothek auf Basis von shadcn/ui, speziell fuer AI-native Interfaces. Die Komponenten werden wie shadcn/ui Primitives eingesetzt: kopiert ins Projekt, anpassbar, keine externe Dependency zur Laufzeit.

**Komponenten installieren:**

```bash
npx ai-elements@latest add prompt-input message conversation
```

Die Komponenten landen in `src/components/ai-elements/`. Falls der Installer nach dem Pfad fragt, diesen angeben.

**Was die Komponenten liefern:**

| Komponente | Teile | Einsatz |
|------------|-------|---------|
| `PromptInput` | `PromptInputTextarea`, `PromptInputSubmit`, `PromptInputFooter`, `PromptInputProvider` | Eingabefelder fuer AI-Interaktionen (statt einfacher Textarea + Button) |
| `Message` | `MessageContent`, `MessageResponse` | Darstellung von AI-Nachrichten (nutzt intern Streamdown) |
| `Conversation` | `ConversationContent` | Container fuer Chat-Verlaeufe mit Scroll-Verhalten |

**Chat-System auf AI Elements umbauen (optional aber empfohlen):**

Das bestehende Chat-Panel kann die AI Elements als Basis nutzen. Das ist kein Muss fuer das Skeleton, aber eine gute Demonstration der Komponenten. Wenn du den Umbau machst:

- `PromptInput` ersetzt das aktuelle Input-Feld + Submit-Button im Chat
- `Conversation` + `ConversationContent` ersetzt den Chat-Nachrichten-Container
- `Message` kann fuer die Darstellung einzelner Nachrichten verwendet werden

Falls du den Chat-Umbau NICHT machst, ist das OK. Die Komponenten sind dann einfach installiert und verfuegbar fuer Projekte die das Skeleton nutzen.

---

## 3. CLAUDE.md aktualisieren

Die CLAUDE.md muss die neuen Tools dokumentieren. Fuege im Tech-Stack-Bereich folgende Eintraege hinzu:

**In der Stack-Tabelle:**

| Komponente | Technologie |
|------------|-------------|
| Markdown | Streamdown + @streamdown/code + @streamdown/mermaid |
| AI Components | Vercel AI Elements (prompt-input, message, conversation) |

**Neue Sektion "AI-Stack" (nach dem Styling-Abschnitt oder an passender Stelle):**

```markdown
## AI-Stack

### Streamdown

Streaming-Markdown-Renderer. Ersetzt `react-markdown`. Loest Probleme mit unvollstaendigem Markdown waehrend AI-Streaming (offene Tags, fehlende Backticks, kaputte Links).

Pakete:
- `streamdown` — Kern-Renderer
- `@streamdown/code` — Syntax-Highlighting fuer Code-Bloecke
- `@streamdown/mermaid` — Mermaid-Diagramm-Rendering mit Fullscreen, Copy, Download

Einsatz:

\```tsx
import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import { mermaid } from "@streamdown/mermaid"

<Streamdown plugins={{ code, mermaid }} isAnimating={isStreaming}>
  {markdownContent}
</Streamdown>
\```

Tailwind-Konfiguration: `globals.css` muss `@source "../node_modules/streamdown/dist/*.js";` enthalten.

Docs: https://streamdown.ai/docs

### Vercel AI Elements

Komponentenbibliothek auf Basis von shadcn/ui fuer AI-native UIs. Installiert in `src/components/ai-elements/`.

Verfuegbare Komponenten:
- `PromptInput` — AI-Eingabefeld (PromptInputTextarea + Submit + Footer)
- `Message` — AI-Nachrichten-Darstellung (nutzt intern Streamdown)
- `Conversation` — Chat-Container mit Scroll-Verhalten

Installation neuer AI Elements: `npx ai-elements@latest add <component>`

Docs: https://ai-elements.dev/docs
```

---

## 4. Feature Flag ergaenzen (optional)

Falls gewuenscht, ein Feature Flag fuer Mermaid-Unterstuetzung in `src/config/features.ts`:

```typescript
export const features = {
  chat: {
    enabled: process.env.NEXT_PUBLIC_CHAT_ENABLED !== "false",
  },
  mermaid: {
    enabled: process.env.NEXT_PUBLIC_MERMAID_ENABLED !== "false",
  },
} as const
```

Damit koennen Projekte die das Skeleton nutzen Mermaid deaktivieren wenn nicht benoetigt.

---

## Zusammenfassung der Aenderungen

| Aktion | Dateien |
|--------|---------|
| **Installieren** | `streamdown`, `@streamdown/code`, `@streamdown/mermaid` |
| **Entfernen** | `react-markdown`, `remark-gfm` |
| **Installieren** | AI Elements via `npx ai-elements@latest add prompt-input message conversation` |
| **Aendern** | `src/app/globals.css` — Tailwind `@source` Direktive |
| **Aendern** | Alle Stellen mit `react-markdown` Import → `streamdown` |
| **Aendern** | `CLAUDE.md` — AI-Stack Dokumentation |
| **Aendern** | `src/config/features.ts` — Mermaid Feature Flag (optional) |
| **Neu** | `src/components/ai-elements/*` — AI Element Komponenten |

**Nicht anfassen:** Auth, Layout, Sidebar, Navigation, DB, API-Routen-Struktur, bestehende shadcn/ui Komponenten.

---

## Verifikation

Nach dem Umbau:

1. `npm run build` laeuft ohne Fehler
2. Kein Import von `react-markdown` oder `remark-gfm` mehr im Projekt
3. `src/components/ai-elements/` existiert mit den drei Komponenten
4. `globals.css` enthaelt die `@source` Direktive fuer Streamdown
5. Chat-Panel rendert Markdown korrekt (mit Streaming)
6. CLAUDE.md dokumentiert die neuen Tools
