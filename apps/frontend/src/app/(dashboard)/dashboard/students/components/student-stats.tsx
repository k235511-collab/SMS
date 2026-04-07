'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserPlus, UserMinus, UserCheck, PieChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface StudentStats {
    total: number
    active: number
    inactive: number
    newThisMonth: number
    genderDistribution: Record<string, number>
}

interface StudentStatsProps {
    stats: StudentStats | null
    loading: boolean
}

export function StudentStats({ stats, loading }: StudentStatsProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                ))}
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.active} Active, {stats.inactive} Inactive
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">New Admissions</CardTitle>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.newThisMonth}</div>
                    <p className="text-xs text-muted-foreground">Joined this month</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Gender Ratio</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.genderDistribution.MALE || 0}M / {stats.genderDistribution.FEMALE || 0}F
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats.genderDistribution.OTHER || 0} Other
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Status</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">Current active rate</p>
                </CardContent>
            </Card>
        </div>
    )
}
