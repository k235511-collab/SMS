/** @type {import('tailwindcss').Config} */

// Helper — creates a Tailwind color value wired to a CSS custom property
// e.g. withAlpha('--primary-600') → 'rgb(var(--primary-600) / <alpha-value>)'
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* ── Layout ────────────────────────────────────────────────── */
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        heading: withAlpha('--heading'),
        subtext: withAlpha('--muted-foreground'),

        /* ── Surface ───────────────────────────────────────────────── */
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },

        /* ── Muted ─────────────────────────────────────────────────── */
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },

        /* ── Accent (hover/active) ─────────────────────────────────── */
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },

        /* ── Border / Input / Ring ─────────────────────────────────── */
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),

        /* ── Popover / Overlay ──────────────────────────────────────── */
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },

        /* ── Destructive (shadcn alias for danger on radix) ────────── */
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },

        /* ── Separator ─────────────────────────────────────────────── */
        separator: withAlpha('--separator'),

        /* ── Primary brand (full scale, overridable per school) ────── */
        primary: {
          50:  withAlpha('--primary-50'),
          100: withAlpha('--primary-100'),
          200: withAlpha('--primary-200'),
          300: withAlpha('--primary-300'),
          400: withAlpha('--primary-400'),
          500: withAlpha('--primary-500'),
          600: withAlpha('--primary-600'),
          700: withAlpha('--primary-700'),
          800: withAlpha('--primary-800'),
          900: withAlpha('--primary-900'),
          950: withAlpha('--primary-950'),
          foreground: withAlpha('--primary-foreground'),
        },

        /* ── Danger ────────────────────────────────────────────────── */
        danger: {
          50:  withAlpha('--danger-50'),
          500: withAlpha('--danger-500'),
          600: withAlpha('--danger-600'),
          700: withAlpha('--danger-700'),
          foreground: withAlpha('--danger-foreground'),
        },

        /* ── Success ───────────────────────────────────────────────── */
        success: {
          50:  withAlpha('--success-50'),
          500: withAlpha('--success-500'),
          600: withAlpha('--success-600'),
          700: withAlpha('--success-700'),
          foreground: withAlpha('--success-foreground'),
        },

        /* ── Warning ───────────────────────────────────────────────── */
        warning: {
          50:  withAlpha('--warning-50'),
          500: withAlpha('--warning-500'),
          600: withAlpha('--warning-600'),
          700: withAlpha('--warning-700'),
          foreground: withAlpha('--warning-foreground'),
        },

        /* ── Semantic Surfaces (for badges/cards) ──────────────────── */
        surface: {
          blue:    withAlpha('--surface-blue'),
          emerald: withAlpha('--surface-emerald'),
          amber:   withAlpha('--surface-amber'),
          rose:    withAlpha('--surface-rose'),
          violet:  withAlpha('--surface-violet'),
          sky:     withAlpha('--surface-sky'),
        },

        /* ── Chart / category accent colours ───────────────────────── */
        chart: {
          1:       withAlpha('--chart-1'),
          '1-light': withAlpha('--chart-1-light'),
          2:       withAlpha('--chart-2'),
          '2-light': withAlpha('--chart-2-light'),
          3:       withAlpha('--chart-3'),
          '3-light': withAlpha('--chart-3-light'),
          4:       withAlpha('--chart-4'),
          '4-light': withAlpha('--chart-4-light'),
          5:       withAlpha('--chart-5'),
          '5-light': withAlpha('--chart-5-light'),
          6:       withAlpha('--chart-6'),
          '6-light': withAlpha('--chart-6-light'),
        },
      },

      borderColor: {
        DEFAULT: withAlpha('--border'),
      },

      ringColor: {
        DEFAULT: withAlpha('--ring'),
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'spin-slow': 'spin 1.5s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
