"use client"

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <p className="text-7xl font-bold text-primary-600">404</p>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/"
          className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Go home
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-700 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
