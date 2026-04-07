'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react'
import {
  THEME_STORAGE_KEY,
  SCHOOL_THEME_CSS_MAP,
  type ThemeMode,
  type SchoolThemeColors,
} from '@/lib/theme'

// ─── Context value ──────────────────────────────────────────────────────────

interface ThemeContextValue {
  /** Current user preference (light | dark | system) */
  theme: ThemeMode
  /** Resolved effective theme after evaluating system preference */
  resolvedTheme: 'light' | 'dark'
  /** Persist and apply a new theme preference */
  setTheme: (mode: ThemeMode) => void
  /** Override the primary colour scale at runtime (per-school branding) */
  applySchoolTheme: (colors: SchoolThemeColors) => void
  /** Remove all school-level primary overrides, reverting to defaults */
  resetSchoolTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

// ─── Anti-FOUC script ───────────────────────────────────────────────────────
// Inline script that runs before React hydrates to prevent flash of wrong mode.

const THEME_SCRIPT = `
(function(){
  try {
    var t = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var r = t;
    if (t === 'system') {
      r = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(r);
    document.documentElement.style.colorScheme = r;
  } catch(e) {}
})()
`

/** Render this in <head> or before the body to prevent FOUC */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeMode
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light')

  // ── Hydrate from localStorage ──
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored)
    }
  }, [])

  // ── Apply resolved theme to <html> ──
  useEffect(() => {
    const root = document.documentElement

    function apply(resolved: 'light' | 'dark') {
      root.classList.remove('light', 'dark')
      root.classList.add(resolved)
      root.style.colorScheme = resolved
      setResolvedTheme(resolved)
    }

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mql.matches ? 'dark' : 'light')

      const handler = (e: MediaQueryListEvent) =>
        apply(e.matches ? 'dark' : 'light')
      mql.addEventListener('change', handler)
      return () => {
        mql.removeEventListener('change', handler)
      }
    }

    apply(theme)
    return undefined
  }, [theme])

  // ── Public setTheme ──
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // Storage unavailable (SSR, incognito quota, etc.)
    }
  }, [])

  // ── School-level primary colour override ──
  const applySchoolTheme = useCallback((colors: SchoolThemeColors) => {
    const root = document.documentElement
    for (const [key, cssVar] of Object.entries(SCHOOL_THEME_CSS_MAP)) {
      const value = colors[key as keyof SchoolThemeColors]
      if (value) {
        root.style.setProperty(cssVar, value)
      }
    }
  }, [])

  const resetSchoolTheme = useCallback(() => {
    const root = document.documentElement
    for (const cssVar of Object.values(SCHOOL_THEME_CSS_MAP)) {
      root.style.removeProperty(cssVar)
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      applySchoolTheme,
      resetSchoolTheme,
    }),
    [theme, resolvedTheme, setTheme, applySchoolTheme, resetSchoolTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>')
  }
  return ctx
}
