'use client'

import React from 'react'
import { ErrorFallback } from '@/components/ui/error-fallback'

export default function AuthError(props: {
  error: Error & { digest?: string }
  reset: () => void
}): JSX.Element {
  const { error } = props
  return (
    <div className="w-full max-w-md">
      <ErrorFallback error={error} />
    </div>
  )
}
 
