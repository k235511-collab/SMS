'use client'

import {
  GraduationCap,
  Users,
  Briefcase,
  LayoutGrid,
} from 'lucide-react'
import { StatCard } from './stat-card'

interface PeopleData {
  students: { total: number; active: number; inactive: number }
  teachers: number
  staff: number
  classes: number
}

interface PeopleStatsProps {
  data: PeopleData
  loading?: boolean
}

export function PeopleStats({ data, loading = false }: PeopleStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Students"
        value={data.students.total}
        icon={<GraduationCap className="h-5 w-5" />}
        variant="primary"
        loading={loading}
      >
        {!loading && (
          <div className="flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active: {data.students.active}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Inactive: {data.students.inactive}
            </span>
          </div>
        )}
      </StatCard>

      <StatCard
        label="Teachers"
        value={data.teachers}
        icon={<Users className="h-5 w-5" />}
        variant="success"
        loading={loading}
      />

      <StatCard
        label="Staff"
        value={data.staff}
        icon={<Briefcase className="h-5 w-5" />}
        variant="warning"
        loading={loading}
      />

      <StatCard
        label="Classes"
        value={data.classes}
        icon={<LayoutGrid className="h-5 w-5" />}
        variant="info"
        loading={loading}
      />
    </div>
  )
}
