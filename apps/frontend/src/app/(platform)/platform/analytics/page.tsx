'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import { api } from '@/lib/api-client'
import { BarChart3, PieChart, TrendingUp, Building2, Users, GraduationCap } from 'lucide-react'

interface Overview {
  schoolsByPlan: { planName: string; count: number }[]
  unassignedSchools: number
  topSchools: { id: string; name: string; slug: string; studentCount: number }[]
}

interface Stats {
  totalSchools: number
  activeSchools: number
  inactiveSchools: number
  totalUsers: number
  totalStudents: number
  totalPlans: number
  newSchoolsThisMonth: number
  monthlyRevenue: number
}

export default function PlatformAnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [overviewRes, statsRes] = await Promise.all([
      api.get<Overview>('/platform/overview'),
      api.get<Stats>('/platform/stats'),
    ])
    if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data as Overview)
    if (statsRes.success && statsRes.data) setStats(statsRes.data as Stats)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <PageLoader message="Loading analytics..." />

  const maxStudents = Math.max(...(overview?.topSchools?.map(s => s.studentCount) || [1]), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Platform-wide insights and statistics"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly Revenue"
          value={`PKR ${stats?.monthlyRevenue?.toLocaleString() || 0}`}
          icon={TrendingUp}
          color="bg-indigo-500"
        />
        <StatCard
          label="New Schools This Month"
          value={stats?.newSchoolsThisMonth || 0}
          icon={Building2}
          color="bg-emerald-500"
        />
        <StatCard
          label="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Total Students"
          value={stats?.totalStudents || 0}
          icon={GraduationCap}
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Schools by Plan - Simple bar visualization */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-foreground">Schools by Plan</h2>
            </div>
            <div className="space-y-3">
              {overview?.schoolsByPlan?.map((item) => {
                const maxPlanCount = Math.max(...(overview.schoolsByPlan.map(p => p.count) || [1]), 1)
                return (
                  <div key={item.planName}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-foreground">{item.planName}</span>
                      <span className="font-semibold text-foreground">{item.count}</span>
                    </div>
                    <div className="h-3 rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${(item.count / maxPlanCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {overview && overview.unassignedSchools > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">No Plan Assigned</span>
                    <span className="font-semibold text-orange-600">{overview.unassignedSchools}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full bg-orange-400 transition-all"
                      style={{ width: `${(overview.unassignedSchools / Math.max(...overview.schoolsByPlan.map(p => p.count), overview.unassignedSchools, 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {(!overview?.schoolsByPlan || overview.schoolsByPlan.length === 0) && (
                <p className="py-4 text-sm text-muted-foreground">No plan data available</p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Top Schools by Students */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-foreground">Top Schools by Students</h2>
            </div>
            <div className="space-y-3">
              {overview?.topSchools?.map((school, i) => (
                <div key={school.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        {i + 1}
                      </span>
                      <span className="text-foreground">{school.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{school.studentCount}</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(school.studentCount / maxStudents) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {(!overview?.topSchools || overview.topSchools.length === 0) && (
                <p className="py-4 text-sm text-muted-foreground">No school data available</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Growth Indicators */}
      <Card>
        <CardBody className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Platform Health</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {stats ? Math.round((stats.activeSchools / Math.max(stats.totalSchools, 1)) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">School Activation Rate</p>
              <div className="mx-auto mt-2 h-2 w-32 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${stats ? (stats.activeSchools / Math.max(stats.totalSchools, 1)) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {stats && stats.totalSchools ? Math.round(stats.totalUsers / stats.totalSchools) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Users Per School</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {stats && stats.totalSchools ? Math.round(stats.totalStudents / stats.totalSchools) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Students Per School</p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
