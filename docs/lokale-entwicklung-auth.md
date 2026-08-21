# Lokale Entwicklung: Login über auth.loschke.ai

Stand 21.08.2026, nach der ersten funktionierenden lokalen Anmeldung. Der
lokale Dev-Server (`pnpm dev`, Port 3000) authentifiziert gegen das
**zentrale, deployte** auth.loschke.ai — es läuft kein lokaler Auth-Server.
Dieses Dokument existiert, weil die erste Einrichtung an vier Stellen
nacheinander gescheitert ist; jede Hürde war die nächste Station im
OIDC-Ablauf.

## Die vier Voraussetzungen in `.env.local`

| Variable | Wert lokal | Warum |
|---|---|---|
| `OIDC_REDIRECT_URI` | `http://localhost:3000/api/auth/callback` | sonst schickt der Login zur Produktion zurück |
| `OIDC_CLIENT_SECRET` | das **LIVE**-Secret (SHA-256-Hash liegt am Client `build-jetzt-main`) | Authorize prüft das Secret nie — erst der Token-Tausch; falsches Secret = `invalid_client` nach der OTP-Eingabe |
| `OIDC_ISSUER` | `https://auth.loschke.ai/api/auth` | better-auth schreibt die Basis **inkl. `/api/auth`** als `iss` ins ID-Token; ohne den Pfad: `unexpected "iss" claim value` |
| `AUTH_REQUIRED_ORG_SLUG` | `build-jetzt` | ohne die Variable fällt `getRequiredOrgSlug()` auf die **Client-ID** zurück (`build-jetzt-main`) — die matcht keinen Org-Slug: `no_membership` |

Dazu: Login nur mit einem Konto, das **approved Mitglied der Org
`build-jetzt`** ist (Mitgliederliste: loschke-auth-Admin bzw. Tabelle
`member`). Nach jeder `.env.local`-Änderung `pnpm dev` neu starten — Next
lädt Env nur beim Start.

## Serverseitige Voraussetzung (einmalig erledigt am 21.08.)

Der Client `build-jetzt-main` in der loschke-auth-Live-DB trägt zusätzlich:

- Redirect-URI `http://localhost:3000/api/auth/callback`
- Post-Logout-URI `http://localhost:3000`

**Achtung:** Das wurde per SQL ergänzt, nicht über die Admin-UI — die
Client-Bearbeitung des **deployten** Admin schreibt derzeit nicht in die DB
(Deploy-Stand älter als die Edit-Funktion `d6a852a`/`79423b7` im Repo).
Bis zum nächsten loschke-auth-Deploy gehen Client-Änderungen nur per SQL.
Rückbau der Dev-Freigabe bei Bedarf:
`array_remove(redirect_uris, 'http://localhost:3000/api/auth/callback')`.

## MCP-Brücke zur media-factory (der Anlass für all das)

- `.env.local`: `MCP_LOCAL_URL_ALLOWLIST=http://127.0.0.1:4700` — gibt den
  lokalen Leitstand-MCP-Server gezielt am SSRF-Guard frei
  (`src/lib/url-validation.ts`); ohne die Variable bleibt Loopback geblockt,
  das Online-Deployment ist unberührt.
- MCP-Server-Eintrag (Admin-UI): Transport `http`,
  URL `http://127.0.0.1:4700/mcp`.
- build.jetzt muss dafür auf dem Host laufen (`pnpm dev`), nicht im
  Container — der Leitstand bindet 127.0.0.1.
- Skill `kontext-factory` manuell hochladen; Quelle bleibt
  `media-factory/skills/kontext-factory/SKILL.md`.

## Diagnose-Spickzettel (falls es wieder klemmt)

Die Fehlerstationen in Reihenfolge des OIDC-Ablaufs:

1. `invalid_redirect` auf auth.loschke.ai → Redirect-URI nicht in der
   Whitelist des Clients (DB-Zeile `oauth_client.redirect_uris`, exact match).
2. `token_exchange_failed … invalid_client` → Client-Secret falsch.
3. `invalid_id_token … unexpected "iss"` → `OIDC_ISSUER` ohne `/api/auth`.
4. `no_membership` → `AUTH_REQUIRED_ORG_SLUG` fehlt/falsch oder das
   Login-Konto ist nicht approved Mitglied der Org.

Whitelist ohne Browser testen: Authorize-URL mit `curl` aufrufen und
schauen, ob die Antwort nach `/login` (akzeptiert) oder auf die
`error=invalid_redirect`-Seite zeigt.

---

*Angelegt 2026-08-21 nach der Ersteinrichtung des lokalen Logins für die
MCP-Brücke zur media-factory. Die `.env.local` war ein Stand von vor
Secret-Rotation und Issuer-Umstellung — daher die Kettenreaktion.*
