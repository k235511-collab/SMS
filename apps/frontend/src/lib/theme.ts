/**
 * Theme system types, constants, and helpers.
 *
 * The theme is driven entirely by CSS custom properties (RGB triplets)
 * so Tailwind can apply alpha via  rgb(var(--token) / <alpha-value>).
 *
 * Schools can override the primary colour scale at runtime by calling
 * `applySchoolTheme()` from the ThemeProvider.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * RGB triplets (e.g. "37 99 235") that override the default primary scale.
 * Only supply the shades you want to change; others keep their defaults.
 */
export interface SchoolThemeColors {
  primary50?: string
  primary100?: string
  primary200?: string
  primary300?: string
  primary400?: string
  primary500?: string
  primary600?: string
  primary700?: string
  primary800?: string
  primary900?: string
  primary950?: string
  primaryForeground?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const THEME_STORAGE_KEY = 'sms-theme'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

/** Maps a SchoolThemeColors key → CSS custom property name */
export const SCHOOL_THEME_CSS_MAP: Record<keyof SchoolThemeColors, string> = {
  primary50: '--primary-50',
  primary100: '--primary-100',
  primary200: '--primary-200',
  primary300: '--primary-300',
  primary400: '--primary-400',
  primary500: '--primary-500',
  primary600: '--primary-600',
  primary700: '--primary-700',
  primary800: '--primary-800',
  primary900: '--primary-900',
  primary950: '--primary-950',
  primaryForeground: '--primary-foreground',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Convert a hex colour (#3b82f6 or #fff) to an RGB triplet string ("59 130 246").
 * Useful for building SchoolThemeColors from a backend hex value.
 */
export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean

  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)

  return `${r} ${g} ${b}`
}

/**
 * Generate a rough 11-shade primary scale from a single brand hex colour.
 * Uses simple tint/shade mixing (white/black) for speed.
 * This is a convenience helper — for production-quality palettes,
 * consider a proper colour-science library.
 */
export function generatePrimaryScale(hex: string): SchoolThemeColors {
  const rgb = hexToRgb(hex)
  const [r, g, b] = rgb.split(' ').map(Number)

  const mix = (c: number, t: number, pct: number) =>
    Math.round(c + (t - c) * pct)

  const tint = (pct: number) =>
    `${mix(r, 255, pct)} ${mix(g, 255, pct)} ${mix(b, 255, pct)}`

  const shade = (pct: number) =>
    `${mix(r, 0, pct)} ${mix(g, 0, pct)} ${mix(b, 0, pct)}`

  return {
    primary50: tint(0.95),
    primary100: tint(0.9),
    primary200: tint(0.7),
    primary300: tint(0.5),
    primary400: tint(0.3),
    primary500: rgb,
    primary600: shade(0.1),
    primary700: shade(0.25),
    primary800: shade(0.4),
    primary900: shade(0.55),
    primary950: shade(0.7),
    primaryForeground: '255 255 255',
  }
}
