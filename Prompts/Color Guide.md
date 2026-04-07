# Color Guide for Product Design
> This guide defines the four-layer color system to follow when applying or correcting colors in this project. Use it as the source of truth for all color decisions.

---

## ⚠️ Abandon the 60-30-10 Rule
The traditional 60-30-10 rule does not apply here. Modern product interfaces follow extreme distributions (e.g., 90% neutral, 8% secondary, 2% accent). Prioritize the four layers below instead.

---

## Layer 1 — Neutral Foundation
*Governs backgrounds, borders, and typography.*

### Backgrounds
| Element | Lightness Target |
|---|---|
| Main background (light mode) | 98–100% white |
| Anchor / sidebar / secondary frame | ~96–98% white (optionally tinted +2% brand hue) |

- Light mode allows three valid layout patterns: dark background + light cards, light background + dark cards, or monochromatic layering.
- Dark mode: surfaces **must get lighter as they elevate**. Raised cards, modals, and search bars must always be a lighter shade than the background behind them.

### Borders & Buttons
| Element | Lightness Target |
|---|---|
| Subtle borders / dividers | ~85% white |
| Low-importance buttons | ~90–95% white |
| High-importance / primary buttons | Darker (use brand accent, see Layer 2) |

- **The Importance Rule:** the more important a button, the darker it should be. Never use thin black borders — define edges with ~85% white instead.

### Typography
| Role | Lightness Target |
|---|---|
| Headings | ~11% white (near black) |
| Body text | 15–20% white |
| Subtext / captions | 30–40% white |

- In **dark mode**, double the perceived distance between text shades. What is 2% apart in light mode needs 4–6% separation in dark mode to remain distinguishable.

---

## Layer 2 — Functional Accents
*Governs brand color, interactive states, and links.*

Use a full **color scale (ramp)** from 50–900 rather than a single flat brand color. Generate ramps via [UI Colors](https://uicolors.app) or equivalent.

| Use Case | Scale Weight |
|---|---|
| Primary / main brand color | 500 or 600 |
| Hover / active state | 700 |
| Links | 400 or 500 |

### Dark Mode Shift
- In dark mode, shift brand/primary colors to **lighter weights (300–400)** to maintain legibility against dark backgrounds.
- Never use the same weight in light and dark mode — the lighter variant is mandatory for dark mode.

---

## Layer 3 — Semantic Communication
*Governs status colors: success, error, warning, progress.*

Semantic colors operate **outside the brand system** and must override it when conveying meaning.

| Semantic Role | Color Rule |
|---|---|
| Destructive / Delete / Error | Always **red**, regardless of brand color |
| Success / Confirm | Green (standard semantic green) |
| Progress / Info | Blue or brand accent |
| Warning | Amber / orange |

### Charts — Use OKLCH
Standard color ramps create inconsistent perceived brightness across hues (neon green reads brighter than blue at the same lightness value). Fix this with **OKLCH**.

**Workflow for chart color sequences:**
1. Go to [oklch.com](https://oklch.com) and set a base **lightness** and **chroma**.
2. Keep lightness and chroma fixed across all chart colors.
3. Increment **hue by 25–30 degrees** per chart element/series.
4. This guarantees perceptually equal brightness across all chart colors.

---

## Layer 4 — Advanced Theming (OKLCH Formula)
*Governs how to derive themed neutral palettes (blue theme, green theme, etc.) without visual guesswork.*

When creating a themed variant of the neutral palette, apply this formula to each neutral hex value:

| Step | Action |
|---|---|
| 1 | Plug the neutral hex into [oklch.com](https://oklch.com) |
| 2 | **Decrease lightness by 0.03** |
| 3 | **Increase chroma by 0.02** |
| 4 | **Set hue** to the target theme color |

- Apply this formula consistently across both light and dark mode neutral scales.
- This ensures visual weight remains consistent across themes — a "blue" theme and a "green" theme will feel equally balanced.

---

## Quick Reference Cheatsheet

```
LIGHT MODE
  Background:         98–100% white
  Sidebar anchor:     96–98% white (+ optional hue tint)
  Borders:            ~85% white
  Buttons (low):      90–95% white
  Heading text:       ~11% white
  Body text:          15–20% white
  Subtext:            30–40% white
  Brand color:        Scale 500–600
  Hover state:        Scale 700
  Links:              Scale 400–500

DARK MODE
  Elevation rule:     Surfaces get LIGHTER as they elevate
  Color distance:     2x the light mode gap (4–6% min between shades)
  Brand color:        Shift to Scale 300–400

SEMANTIC (any mode)
  Destructive:        Always red
  Charts:             OKLCH, fixed L+C, hue +25–30° per series

THEMING NEUTRALS (OKLCH)
  Lightness:          − 0.03
  Chroma:             + 0.02
  Hue:                → target theme hue
```
