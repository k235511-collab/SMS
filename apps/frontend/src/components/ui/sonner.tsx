'use client'

import { useTheme } from '@/context/theme-context'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Pre-configured Sonner toaster wired to the application&rsquo;s theme.
 *
 * Drop `<Toaster />` once in `providers.tsx` — then use `toast()` / `toast.success()` etc.
 * from anywhere.
 */
function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary-600 group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
