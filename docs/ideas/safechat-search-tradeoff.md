# SafeChat × Such-Tools — Tradeoff-Entscheidung

> **Status:** Offen / Beobachtung. Aktuell Variante A aktiv. Entscheidung über B/C erst mit echtem Nutzerverhalten + Unternehmens-Feedback.

## Kontext

SafeChat routet die LLM-Inferenz auf EU/DE/lokale Modelle (Mistral, IONOS, Ollama). Konversation und Antwort-Generierung verlassen die EU nicht. Aber Such-Tools haben jeweils ein eigenes Risiko-Profil — die Inferenz-Sicherheit allein bedeutet nicht "kein Datenabfluss".

## Datenfluss der drei Such-Tools

| Tool | Was geht raus | An wen | Konversation an wen |
|---|---|---|---|
| `web_search` | Nur Query-String (vom Modell formuliert) | Firecrawl (US) → Suchmaschine | Bleibt bei Mistral/IONOS |
| `google_search` | Query-String + Gemini übernimmt Antwort-Synthese | Google (US) | Query + Synthese durch Google |
| `deep_research` | Query (oft ausführlich) + 5–12 Min Research-Agent | Google (US) | Komplette Research bei Google |

**Aktuell im SafeChat geblockt:** `google_search`, `deep_research` (Tool-Registry + System-Prompt).
**Aktuell im SafeChat aktiv:** `web_search`.

## Das Restrisiko bei web_search

Das Modell baut den Query-String aus der User-Frage. Bei sensiblen Recherchen (z.B. Konkurrenzanalyse zu einer eigenen Produktidee) landet die Idee in Stichwort-Form als Suchquery auf einem US-Server. Kein Konversationskontext, aber je nach Spezifität reichen Stichworte, um die Idee identifizierbar zu machen.

## Drei Varianten

### A — Status quo (aktiv)

`web_search` bleibt im SafeChat verfügbar. `google_search` + `deep_research` geblockt.

- **Pro:** Aktuelles Wissen verfügbar, sinnvolle UX. Konversation + Idee-Kontext bleiben in der EU.
- **Contra:** Stichworte können via Suchquery leaken. "SafeChat" verspricht implizit mehr als geliefert wird.

### B — Strenger SafeChat

`web_search` im SafeChat ebenfalls deaktivieren. Modell antwortet nur aus Weltwissen.

- **Pro:** Echtes "nichts geht raus". Versprechen und Realität decken sich.
- **Contra:** Keine aktuellen Daten. Modell muss explizit kommunizieren, dass es nicht recherchieren kann ("Wechsle den Modus, um zu recherchieren").

### C — Query-Confirm

Vor jedem `web_search`-Call zeigt ein Dialog die Query, User bestätigt oder editiert (analog zum PII-Dialog).

- **Pro:** User sieht, was rausgeht. Volle Kontrolle.
- **Contra:** UX-Reibung — jeder Search-Call braucht einen Klick. Bei Mehrfach-Searches im Stream nervig.

## Wann entscheiden

Trigger für die Entscheidung B/C:

- **Feedback aus Unternehmens-Pilots:** Wie wichtig ist Such-Funktionalität im SafeChat-Modus? Wie hoch ist die Sensibilität für Stichwort-Leaks?
- **Tatsächliche Nutzung:** Wie oft wird im SafeChat überhaupt `web_search` getriggert? Wenn selten → B problemloser. Wenn häufig → C besser.
- **Compliance-Anforderungen:** Falls Kunden DSGVO-Audits durchführen, kann die Stichwort-Leak-Frage Stein des Anstoßes werden — dann B oder C nötig.

## Implementierungs-Hinweise (für später)

- **Variante B:** In `src/app/api/chat/build-tools.ts` den `searchEnabled`-Branch auch von `!effectivePrivacyRoute` abhängig machen. Plus System-Prompt-Hinweis im Privacy-Modus, dass Recherche nicht verfügbar ist.
- **Variante C:** Neuer Dialog-Flow analog zu `business-mode/pii-check`. Tool-Execute pausiert, Client zeigt Query, User bestätigt → addToolOutput. Frontend braucht ein zusätzliches Dialog-Komponente.
