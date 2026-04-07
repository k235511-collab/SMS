'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { api } from '@/lib/api-client'
import { GoogleAccountPicker, type GoogleAccount } from '@/components/ui/google-account-picker'
import { CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const [useManualAdmin, setUseManualAdmin] = useState(false)
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null)
  
  const [form, setForm] = useState({
    schoolName: '',
    email: '',
    phone: '',
    address: '',
    domain: '',
    website: '',
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    adminFirstName: '',
    adminLastName: '',
    adminGoogleId: '',
  })
  
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function updateField(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (useManualAdmin) {
      if (form.adminPassword !== form.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (form.adminPassword.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    if (!form.schoolName) {
      setError('School name is required')
      return
    }

    if (!form.adminEmail || !form.adminFirstName || !form.adminLastName) {
      setError('Admin details are required')
      return
    }

    setIsLoading(true)

    try {
      // Omit confirmPassword from the payload
      const { confirmPassword, ...payload } = form
      
      const res = await api.post('/auth/register-school', payload)
      if (res.success) {
        setIsSuccess(true)
      } else {
        setError(res.message || 'Registration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="max-w-md mx-auto">
        <CardBody className="space-y-6 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Request Submitted
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your registration request for <strong>{form.schoolName}</strong> has been submitted successfully to the platform administrators.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              We will review your request and notify you once your school account has been approved and activated.
            </p>
          </div>
          <Button asChild variant="outline" className="w-full mt-4">
            <Link href="/login">Return to login</Link>
          </Button>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="max-w-xl mx-auto">
      <CardBody className="space-y-6 p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Register your school
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a request to create a new school portal on SMS
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">School Details</h3>
            
            <Input
              label="School Name *"
              value={form.schoolName}
              onChange={updateField('schoolName')}
              required
              placeholder="Springfield Academy"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="School Email"
                type="email"
                value={form.email}
                onChange={updateField('email')}
                placeholder="info@school.com"
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={updateField('phone')}
                placeholder="+1234567890"
              />
            </div>
            
            <Input
              label="Address"
              value={form.address}
              onChange={updateField('address')}
              placeholder="123 Education Lane"
            />
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Domain"
                value={form.domain}
                onChange={updateField('domain')}
                placeholder="school.example.com"
              />
              <Input
                label="Website"
                value={form.website}
                onChange={updateField('website')}
                placeholder="https://school.com"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Admin Account</h3>
                <p className="text-xs text-muted-foreground">This will be the primary super admin.</p>
              </div>
              <Button variant="link" size="sm" onClick={() => setUseManualAdmin(!useManualAdmin)} type="button">
                {useManualAdmin ? 'Use Google instead' : 'Use email/password'}
              </Button>
            </div>

            {!useManualAdmin ? (
              <div className="mb-4">
                <GoogleAccountPicker 
                  account={googleAccount}
                  onChange={(acc) => {
                    setGoogleAccount(acc)
                    if (acc) {
                      setForm(prev => ({
                        ...prev,
                        adminEmail: acc.email,
                        adminFirstName: acc.name.split(' ')[0] || '',
                        adminLastName: acc.name.split(' ').slice(1).join(' ') || '',
                        adminGoogleId: acc.googleId,
                        adminPassword: '',
                        confirmPassword: ''
                      }))
                    } else {
                      setForm(prev => ({ 
                        ...prev, 
                        adminEmail: '', 
                        adminFirstName: '', 
                        adminLastName: '', 
                        adminGoogleId: '' 
                      }))
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Input 
                  label="Admin Email *"
                  type="email" 
                  value={form.adminEmail} 
                  onChange={updateField('adminEmail')}
                  required
                  placeholder="admin@school.com" 
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Input 
                    label="First Name *"
                    value={form.adminFirstName} 
                    onChange={updateField('adminFirstName')}
                    required
                    placeholder="First Name" 
                  />
                  <Input 
                    label="Last Name *"
                    value={form.adminLastName} 
                    onChange={updateField('adminLastName')}
                    required
                    placeholder="Last Name" 
                  />
                </div>

                <Input 
                  label="Password *"
                  type="password" 
                  value={form.adminPassword} 
                  onChange={updateField('adminPassword')}
                  required
                  placeholder="Min 6 characters" 
                />

                <Input
                  label="Confirm password *"
                  type="password"
                  value={form.confirmPassword}
                  onChange={updateField('confirmPassword')}
                  required
                  placeholder="Re-enter your password"
                />
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full mt-6" 
            isLoading={isLoading}
            disabled={!form.schoolName || !form.adminEmail}
          >
            Submit Registration Request
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary-600 hover:text-primary-700"
          >
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  )
}
