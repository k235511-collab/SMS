import type { ReactNode } from 'react'

/**
 * Auth layout — centered card on a clean background.
 * Used for login, register, forgot-password pages.
 * No sidebar, no nav — just the form.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          SMS <span className="text-primary-600">SaaS</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          School Management System
        </p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
