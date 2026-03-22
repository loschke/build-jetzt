---
name: Bildprompt-Patterns
slug: image-prompt-patterns
description: Bewährte Prompt-Strukturen und Vokabular für KI-Bildgenerierung — Stile, Beleuchtung, Perspektiven, Materialien
---

# Bildprompt-Patterns

Referenz für die Formulierung präziser Bildprompts. Nutze diese Patterns als Bausteine.

## Prompt-Struktur

Effektive Prompts folgen einer Hierarchie von wichtig zu unwichtig:

```
[Subjekt] + [Medium/Stil] + [Beleuchtung] + [Komposition] + [Stimmung/Atmosphäre] + [technische Details]
```

Nicht jeder Prompt braucht alle Elemente. Einfache Bilder: Subjekt + Stil. Komplexe Bilder: alle Dimensionen.

## Stil-Referenzen

| Kategorie | Tokens (englisch) |
|---|---|
| Fotorealistisch | `photorealistic, DSLR photo, 35mm film, shot on Canon EOS R5, RAW photo` |
| Editorial | `editorial photography, magazine cover, Vogue style, fashion editorial` |
| Cinematic | `cinematic still, film grain, anamorphic lens, movie scene, directed by [Name]` |
| Illustration | `digital illustration, concept art, matte painting, book illustration` |
| 3D | `3D render, octane render, unreal engine, blender, C4D, isometric` |
| Aquarell | `watercolor painting, soft washes, wet-on-wet technique, paper texture` |
| Minimalistisch | `minimalist, flat design, simple shapes, negative space, clean lines` |

## Beleuchtung

| Stimmung | Tokens |
|---|---|
| Warm / Golden | `golden hour, warm sunlight, amber tones, sunset lighting` |
| Dramatisch | `dramatic lighting, chiaroscuro, high contrast, rim light, backlit` |
| Studio | `studio lighting, softbox, even lighting, product photography lighting` |
| Natürlich | `natural light, overcast sky, diffused light, window light` |
| Neon/Urban | `neon lights, cyberpunk lighting, colored gels, RGB lighting` |
| Mysteriös | `fog, volumetric light, god rays, atmospheric haze, low key` |

## Perspektive / Kamera

| Wirkung | Tokens |
|---|---|
| Nähe/Detail | `close-up, macro, extreme close-up, shallow depth of field, bokeh` |
| Überblick | `wide angle, establishing shot, aerial view, drone shot, bird's eye` |
| Augenhöhe | `eye level, street photography, candid, documentary style` |
| Dramatik | `low angle, worm's eye view, dutch angle, fisheye` |
| Entfernung | `telephoto, compressed perspective, long lens, 200mm` |

## Materialien / Texturen

```
Organisch: wood grain, marble, stone, moss, bark, linen, cotton, leather
Metallisch: brushed steel, copper, brass, chrome, oxidized metal, patina
Transparent: glass, crystal, ice, water droplets, translucent, frosted
Digital: holographic, glitch, pixel art, wireframe, circuit board, data visualization
```

## Farb-Paletten

```
Moody: desaturated, muted tones, earth tones, dark palette
Vibrant: saturated colors, complementary colors, bold palette, pop art colors
Pastell: soft pastels, light palette, millennial pink, lavender
Monochrom: black and white, sepia, duotone, single color accent
Natur: forest green, ocean blue, sunset orange, autumn colors
```

## Anti-Patterns

Vermeide diese Begriffe — sie führen zu generischen Ergebnissen:
- `beautiful`, `amazing`, `stunning`, `perfect` — zu vage
- `high quality`, `best quality`, `masterpiece` — Filler ohne Wirkung bei modernen Modellen
- `4K, 8K, ultra HD` — bei Gemini/DALL-E irrelevant
- Negatives Prompting (`no text, no watermark`) — beschreibe was du willst, nicht was du nicht willst
