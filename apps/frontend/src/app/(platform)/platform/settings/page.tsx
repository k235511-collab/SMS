'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import { api } from '@/lib/api-client'
import {
  Mail,
  CreditCard,
  Shield,
  Globe,
  Wrench,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

type SettingsMap = Record<string, Record<string, string>>

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const [general, setGeneral] = useState({
    platform_name: 'SMS SaaS',
    support_email: '',
    platform_url: 'http://localhost:3000',
  })

  const [smtp, setSmtp] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get<SettingsMap>('/platform/settings')
      if (res.success && res.data) {
        const data = res.data as SettingsMap
        const g = data.general || {}
        setGeneral({
          platform_name: g.platform_name || 'SMS SaaS',
          support_email: g.support_email || '',
          platform_url: g.platform_url || 'http://localhost:3000',
        })
        const s = data.smtp || {}
        setSmtp({
          smtp_host: s.smtp_host || '',
          smtp_port: s.smtp_port || '587',
          smtp_user: s.smtp_user || '',
          smtp_password: s.smtp_password || '',
          smtp_from: s.smtp_from || '',
        })
      }
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const saveSettings = async (group: string, entries: Record<string, string>) => {
    setSaving(group)
    try {
      const payload = Object.entries(entries).map(([key, value]) => ({
        key, value, group,
      }))
      const res = await api.patch('/platform/settings', { settings: payload })
      if (res.success) toast.success(`${group.charAt(0).toUpperCase() + group.slice(1)} settings saved`)
      else toast.error('Failed to save settings')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <PageLoader message="Loading settings..." />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Global configuration for the SMS platform"
      />

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-foreground">General</h2>
            </div>
            <div className="grid gap-4 max-w-lg">
              <div className="grid gap-2">
                <Label>Platform Name</Label>
                <Input
                  value={general.platform_name}
                  onChange={(e) => setGeneral({ ...general, platform_name: e.target.value })}
                  placeholder="Platform Name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Support Email</Label>
                <Input
                  type="email"
                  value={general.support_email}
                  onChange={(e) => setGeneral({ ...general, support_email: e.target.value })}
                  placeholder="support@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Platform URL</Label>
                <Input
                  value={general.platform_url}
                  onChange={(e) => setGeneral({ ...general, platform_url: e.target.value })}
                  placeholder="https://yourdomain.com"
                />
              </div>
              <Button className="w-fit" onClick={() => saveSettings('general', general)} disabled={saving === 'general'}>
                <Save className="mr-2 h-4 w-4" />
                {saving === 'general' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* SMTP Settings */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-foreground">Email / SMTP</h2>
            </div>
            <div className="grid gap-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>SMTP Host</Label>
                  <Input
                    value={smtp.smtp_host}
                    onChange={(e) => setSmtp({ ...smtp, smtp_host: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>SMTP Port</Label>
                  <Input
                    value={smtp.smtp_port}
                    onChange={(e) => setSmtp({ ...smtp, smtp_port: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Username</Label>
                  <Input
                    value={smtp.smtp_user}
                    onChange={(e) => setSmtp({ ...smtp, smtp_user: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={smtp.smtp_password}
                    onChange={(e) => setSmtp({ ...smtp, smtp_password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>From Address</Label>
                <Input
                  value={smtp.smtp_from}
                  onChange={(e) => setSmtp({ ...smtp, smtp_from: e.target.value })}
                  placeholder="noreply@sms-saas.com"
                />
              </div>
              <Button className="w-fit" onClick={() => saveSettings('smtp', smtp)} disabled={saving === 'smtp'}>
                <Save className="mr-2 h-4 w-4" />
                {saving === 'smtp' ? 'Saving...' : 'Save SMTP Settings'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Payment Settings */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-foreground">Payment Gateway</h2>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Configure Stripe or other payment gateway for automated school billing.
              Includes publishable key, secret key, and webhook secret for real-time payment events.
            </p>
          </CardBody>
        </Card>

        {/* Security */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-semibold text-foreground">Security</h2>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Configure password policies, session timeouts, IP whitelists, 2FA requirements,
              and other security settings for the platform.
            </p>
          </CardBody>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-foreground">Maintenance</h2>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg">
              Enable maintenance mode to temporarily disable access for all schools while
              performing updates. Configure maintenance window schedules and notification messages.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
