---
name: carousel-factory
description: "LinkedIn Carousel Factory mit Multi-Brand-Support. Erstellt LinkedIn Carousels fuer loschke.ai (default), unlearn.how und lernen.diy. Enthaelt 14 validierte Slide-Typen und Export-Funktionalitaet (PDF, PNG). Bei Carousel-Erstellung immer nach Brand fragen oder loschke.ai als Default verwenden."
---

# LinkedIn Carousel – Slide-Bibliothek

Validierte Slide-Typen fuer LinkedIn Carousels. Multi-Brand-faehig.

## Slide-Typen

| ID | Name | Einsatz | Varianten |
|----|------|---------|-----------|
| 01 | usecase-prompt | Situation + konkreter Prompt | 1 |
| 02 | statement-context | Problem-Setup, These | 1 |
| 03 | series-overview | Serien-Uebersicht mit Fortschritt | 1 |
| 04 | prompt-focused | Prompt im Fokus | 1 |
| 05 | compare-better | Nicht optimal vs. Besser | 1 |
| 06 | myth-reality | Annahme vs. Realitaet | 1 |
| 07 | trap-solution | Falle + Loesung | 1 |
| 08 | titel-slides | Titel/Hook | A–H (8) |
| 09 | quote-slides | Zitate | A–E (5) |
| 10 | stat-slides | Statistiken/Zahlen | A–E (5) |
| 11 | fazit-slides | Abschluss/Summary | A–E (5) |
| 12 | def-slides | Begriffsklaerungen | A–E (5) |
| 13 | cta-slides | Call-to-Action | A–D (4) |
| 14 | list-slides | Listen/Frameworks | A–D (4) |

**Fuer Specs eines Typs:** `references/[name].md` lesen
**Fuer HTML-Template:** `assets/[name].html` verwenden

## Brand & Design

**Farben und Brand-CSS:** Lies aus `assets/_base.css` und `assets/_brands.css`

**Drei Brands verfuegbar:** loschke.ai (default), unlearn.how, lernen.diy

**Typografie-Kurzform:**
- Headlines: Noto Sans 900, 28–52px
- Sublines/Labels: Instrument Serif, 18–22px
- Fliesstext: Noto Sans 400–600, 17–20px

**Format:** 540 x 675px, Padding 48px, Footer 60px

## Design-Regeln

1. **Accent-Hintergrund = helle Schrift** – Text auf Akzentfarbe immer weiss
2. **Hintergruende alternieren** – bg-dark / bg-dark-alt wechseln
3. **Instrument Serif muted: 18–22px** – nie kleiner
4. **Ein Gedanke pro Slide** – max 40–50 Woerter
5. **Akzentfarbe sparsam** – nur fuer Highlights, Nummern, CTAs

## Workflow (Code Execution Container)

1. Brand waehlen (oder Default loschke.ai)
2. Farben aus `assets/_base.css` lesen (+ `assets/_brands.css` fuer Brand-Varianten)
3. Slide-Typen fuer Carousel waehlen
4. `references/[name].md` fuer Specs lesen
5. `assets/[name].html` als strukturelle Referenz nutzen
6. Slides programmatisch zusammenbauen:
   - CSS aus `_base.css` inline einbetten
   - Brand-CSS aus `_brands.css` inline einbetten
   - Google Fonts Link einbinden (Noto Sans, Instrument Serif)
   - Inhalte einsetzen, Hintergruende alternieren
7. Export-Panel aus `assets/_export-panel.html` vor `</body>` einbinden
8. Als `carousel.html` speichern

## Typische Carousel-Struktur

| Position | Typ | Zweck |
|----------|-----|-------|
| 1 | titel-slides | Hook |
| 2–3 | statement-context, def-slides | Setup |
| 4–8 | list-slides, compare-better, stat-slides | Inhalt |
| 9–10 | fazit-slides | Summary |
| 11–12 | cta-slides, series-overview | CTA |

## HTML-Ausgabe

Alle Slides in einer HTML-Datei, CSS eingebettet, Google Fonts eingebunden.
CSS-Variablen aus `assets/_base.css` und `assets/_brands.css` uebernehmen.

## Export-Panel

Bei produktiven Carousels das Export-Panel aus `assets/_export-panel.html` vor `</body>` einfuegen.

- **PDF fuer LinkedIn** – Alle Slides als mehrseitiges PDF
- **Einzel-PNGs** – Fuer Instagram/Threads

## Footer-Struktur

**loschke.ai:**
```html
<div class="slide-footer">
    <div class="logo"><span class="rl">RL</span><span class="dot">.</span></div>
    <div class="slide-number">01</div>
</div>
```

**unlearn.how / lernen.diy:**
```html
<div class="slide-footer">
    <div class="logo logo-brand">
        <span class="brand-name">[name]</span><span class="brand-ext">.[tld]</span>
    </div>
    <div class="slide-number">01</div>
</div>
```

Fuer Logo-CSS siehe `assets/_brands.css`.
