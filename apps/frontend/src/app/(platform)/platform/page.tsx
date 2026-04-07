'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api-client'
import {
  Building2,
  Users,
  GraduationCap,
  CreditCard,
  UserCheck,
  UserX,
  TrendingUp,
  DollarSign,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

interface PlatformStats {
  totalSchools: number
  activeSchools: number
  inactiveSchools: number
  totalUsers: number
  totalStudents: number
  totalTeachers: number
  totalPlans: number
  newSchoolsThisMonth: number
  monthlyRevenue: number
}

interface RecentActivity {
  recentSchools: Array<{
    id: string; name: string; slug: string; isActive: boolean; createdAt: string
    subscriptionPlan?: { name: string }
  }>
  recentLogins: Array<{
    firstName: string; lastName: string; email: string; lastLoginAt: string
    school: { name: string; slug: string }
  }>
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [activity, setActivity] = useState<RecentActivity | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        api.get<PlatformStats>('/platform/stats'),
        api.get<RecentActivity>('/platform/recent-activity?limit=10'),
      ])
      if (statsRes.success && statsRes.data) setStats(statsRes.data)
      if (activityRes.success && activityRes.data) setActivity(activityRes.data)
    } catch (_e) {
      // ignore
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <PageLoader message="Loading dashboard..." />

  const statCards = stats ? [
    { label: 'Total Schools', value: stats.totalSchools, icon: Building2, color: 'bg-blue-500', href: '/platform/schools' },
    { label: 'Active Schools', value: stats.activeSchools, icon: UserCheck, color: 'bg-emerald-500', href: '/platform/schools' },
    { label: 'Inactive / Suspended', value: stats.inactiveSchools, icon: UserX, color: 'bg-red-500', href: '/platform/schools' },
    { label: 'New This Month', value: stats.newSchoolsThisMonth, icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Monthly Revenue', value: `PKR ${(stats.monthlyRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500', href: '/platform/plans' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-cyan-500' },
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-pink-500' },
    { label: 'Subscription Plans', value: stats.totalPlans, icon: CreditCard, color: 'bg-indigo-500', href: '/platform/plans' },
  ] : []

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Dashboard"
        description="Overview of your entire SMS SaaS platform"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Schools */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Schools</h2>
              <Link href="/platform/schools" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {activity?.recentSchools?.slice(0, 5).map((school) => (
                <Link
                  key={school.id}
                  href={`/platform/schools/${school.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{school.name}</p>
                      <p className="text-xs text-muted-foreground">{school.subscriptionPlan?.name || 'No plan'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={school.isActive ? 'ACTIVE' : 'INACTIVE'} size="xs" />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(school.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
              {(!activity?.recentSchools || activity.recentSchools.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">No schools yet</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Recent Logins */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Logins</h2>
              <Link href="/platform/audit" className="text-sm text-primary-600 hover:text-primary-700">
                View logs
              </Link>
            </div>
            <div className="space-y-3">
              {activity?.recentLogins?.slice(0, 5).map((login, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                      {login.firstName?.[0]}{login.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {login.firstName} {login.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{login.school?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {login.lastLoginAt ? new Date(login.lastLoginAt).toLocaleString() : 'Never'}
                  </div>
                </div>
              ))}
              {(!activity?.recentLogins || activity.recentLogins.length === 0) && (
                <p className="py-4 text-center text-sm text-muted-foreground">No recent logins</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardBody className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Add New School', href: '/platform/schools?action=create', icon: Building2 },
              { label: 'Manage Plans', href: '/platform/plans', icon: CreditCard },
              { label: 'View Analytics', href: '/platform/analytics', icon: TrendingUp },
              { label: 'Audit Logs', href: '/platform/audit', icon: Clock },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <action.icon className="h-4 w-4 text-muted-foreground" />
                {action.label}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
