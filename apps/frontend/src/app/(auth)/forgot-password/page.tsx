'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardBody className="space-y-6 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Need help signing in?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Password resets are handled by your school administrator.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Contact your school admin to reset your password. You&apos;ll receive a temporary password and be asked to
          change it after signing in.
        </div>

        <Button asChild className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  )
}
