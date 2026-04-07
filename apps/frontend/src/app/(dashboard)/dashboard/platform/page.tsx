'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlatformOnly } from '@/components/auth'
import { Card, CardBody } from '@/components/ui/card'
import { api } from '@/lib/api-client'
import {
  Building2,
  Users,
  GraduationCap,
  CreditCard,
  UserCheck,
  UserX,
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
}

export default function PlatformDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    const res = await api.get<PlatformStats>('/platform/stats')
    if (res.success && res.data) {
      setStats(res.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const statCards = stats
    ? [
        { label: 'Total Schools', value: stats.totalSchools, icon: Building2, color: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400', href: '/dashboard/platform/schools' },
        { label: 'Active Schools', value: stats.activeSchools, icon: UserCheck, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400', href: '/dashboard/platform/schools' },
        { label: 'Inactive Schools', value: stats.inactiveSchools, icon: UserX, color: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400', href: '/dashboard/platform/schools' },
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400' },
        { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' },
        { label: 'Total Teachers', value: stats.totalTeachers, icon: Users, color: 'bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400' },
        { label: 'Subscription Plans', value: stats.totalPlans, icon: CreditCard, color: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400', href: '/dashboard/platform/plans' },
      ]
    : []

  return (
    <PlatformOnly fallback={<div className="p-8 text-center text-muted-foreground">Access denied — Platform Admin only</div>}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Administration</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all schools, plans, and platform-level settings
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              const card = (
                <Card key={stat.label} className="transition-shadow hover:shadow-md">
                  <CardBody className="flex items-center gap-4">
                    <div className={`rounded-xl p-3 ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </CardBody>
                </Card>
              )

              if (stat.href) {
                return (
                  <Link key={stat.label} href={stat.href}>
                    {card}
                  </Link>
                )
              }

              return card
            })}
          </div>
        )}

        {/* Quick Links */}
        <Card>
          <CardBody>
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/dashboard/platform/schools"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Manage Schools
              </Link>
              <Link
                href="/dashboard/platform/plans"
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Manage Plans
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </PlatformOnly>
  )
}
