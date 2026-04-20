'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/auth-context'
import { AuthError } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { GoogleSignInButton } from '@/components/ui/google-sign-in-button'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login, loginWithGoogle, isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    if (user?.isPlatformAdmin) {
      router.replace('/platform')
      return
    }

    router.replace(callbackUrl)
  }, [authLoading, isAuthenticated, user, router, callbackUrl])

  function redirectToAccessBlocked(error: AuthError) {
    const params = new URLSearchParams()
    params.set('code', error.code || 'PLAN_EXPIRED')
    if (error.message) {
      params.set('message', error.message)
    }

    const schoolName = error.meta?.schoolName
    if (typeof schoolName === 'string' && schoolName.length > 0) {
      params.set('schoolName', schoolName)
    }

    const expiry = error.meta?.subscriptionExpiresAt
    if (typeof expiry === 'string' && expiry.length > 0) {
      params.set('expiry', expiry)
    }

    router.push(`/plan-expired?${params.toString()}`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await login({ email, password })
      if (user.isPlatformAdmin) {
        router.push('/platform')
      } else {
        router.push(callbackUrl)
      }
    } catch (err) {
      if (
        err instanceof AuthError &&
        (err.code === 'PLAN_EXPIRED' || err.code === 'SCHOOL_SUSPENDED')
      ) {
        redirectToAccessBlocked(err)
        return
      }
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogleSignIn(credential: string) {
    setError('')
    setIsLoading(true)

    try {
      const user = await loginWithGoogle(credential)
      if (user.isPlatformAdmin) {
        router.push('/platform')
      } else {
        router.push(callbackUrl)
      }
    } catch (err) {
      if (
        err instanceof AuthError &&
        (err.code === 'PLAN_EXPIRED' || err.code === 'SCHOOL_SUSPENDED')
      ) {
        redirectToAccessBlocked(err)
        return
      }
      setError(err instanceof Error ? err.message : 'Google Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardBody className="space-y-6 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your credentials to access the portal
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign in
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        <GoogleSignInButton onSuccess={handleGoogleSignIn} />

        <div className="space-y-3 text-center text-sm mt-6">
          <Link
            href="/forgot-password"
            className="text-primary-600 hover:text-primary-700"
          >
            Forgot your password? Contact your admin
          </Link>
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Register
            </Link>
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
