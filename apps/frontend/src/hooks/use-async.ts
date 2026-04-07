'use client'

import { useState, useCallback } from 'react'

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseAsyncReturn<T, Args extends unknown[]> {
  execute: (...args: Args) => Promise<T | undefined>
  data: T | undefined
  error: Error | null
  isLoading: boolean
  reset: () => void
}

/**
 * Wraps an async function with loading/error state management.
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error } = useAsync(authService.login, {
 *   onSuccess: () => router.push('/dashboard'),
 * })
 * ```
 */
export function useAsync<T, Args extends unknown[]>(
  asyncFn: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {},
): UseAsyncReturn<T, Args> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const execute = useCallback(
    async (...args: Args): Promise<T | undefined> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFn(...args)
        setData(result)
        options.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        options.onError?.(error)
        return undefined
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [asyncFn],
  )

  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
    setIsLoading(false)
  }, [])

  return { execute, data, error, isLoading, reset }
}
