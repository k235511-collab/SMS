'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

interface SectionAttendance {
  sectionName: string
  present: number
  absent: number
  late: number
  leave: number
}

interface ClassAttendance {
  className: string
  present: number
  absent: number
  late: number
  leave: number
  sections: SectionAttendance[]
}

interface AttendanceSummary {
  present: number
  absent: number
  late: number
  leave: number
}

interface AttendanceChartProps {
  summary: AttendanceSummary
  byClass: ClassAttendance[]
  loading?: boolean
}

const STATUS_COLORS = {
  present: '#22c55e',
  absent: '#ef4444',
  late: '#f59e0b',
  leave: '#3b82f6',
}

// Distinct colors for different sections
const SECTION_COLORS = [
  '#6366f1', // indigo
  '#f97316', // orange
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#eab308', // yellow
  '#2563eb', // blue
  '#a855f7', // purple
  '#10b981', // emerald
]

/* Custom tooltip for section view */
function SectionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.fill || p.color }} />
              {p.name}
            </span>
            <span className="font-semibold">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AttendanceChart({ summary, byClass, loading = false }: AttendanceChartProps) {
  const [selectedClassIdx, setSelectedClassIdx] = useState<number>(-1) // -1 = all classes overview

  const selectedClass = selectedClassIdx >= 0 ? byClass[selectedClassIdx] : null

  // Determine summary values based on filter
  const displaySummary = useMemo(() => {
    if (!selectedClass) return summary
    return {
      present: selectedClass.present,
      absent: selectedClass.absent,
      late: selectedClass.late,
      leave: selectedClass.leave,
    }
  }, [selectedClass, summary])

  const totalRecords = displaySummary.present + displaySummary.absent + displaySummary.late + displaySummary.leave

  // Build chart data based on selection
  const { chartData, sectionNames, viewMode } = useMemo(() => {
    if (selectedClass && selectedClass.sections.length > 0) {
      // SECTION VIEW: show sections as groups, each bar = a status (Present/Absent/Late/Leave)
      const data = selectedClass.sections.map((sec) => ({
        name: `Sec ${sec.sectionName}`,
        present: sec.present,
        absent: sec.absent,
        late: sec.late,
        leave: sec.leave,
      }))
      return { chartData: data, sectionNames: [] as string[], viewMode: 'sections' as const }
    }

    // ALL CLASSES VIEW: each class on X-axis, sections as separate bars
    // Collect all unique section names across all classes
    const allSections = new Set<string>()
    byClass.forEach(cls => cls.sections.forEach(s => allSections.add(s.sectionName)))
    const sortedSections = Array.from(allSections).sort()

    const data = byClass.map((cls) => {
      const entry: Record<string, any> = { name: cls.className }
      cls.sections.forEach((sec) => {
        const total = sec.present + sec.absent + sec.late + sec.leave
        entry[sec.sectionName] = total
      })
      return entry
    })

    return { chartData: data, sectionNames: sortedSections, viewMode: 'classes' as const }
  }, [selectedClass, byClass])

  if (loading) {
    return (
      <Card className="p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </Card>
    )
  }

  return (
    <Card className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Today&apos;s Attendance
        </h3>
        {/* Class filter dropdown */}
        <select
          value={selectedClassIdx}
          onChange={(e) => setSelectedClassIdx(Number(e.target.value))}
          className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value={-1}>All Classes</option>
          {byClass.map((cls, idx) => (
            <option key={idx} value={idx}>{cls.className}</option>
          ))}
        </select>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.present }} />
          Present: {displaySummary.present}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.absent }} />
          Absent: {displaySummary.absent}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.late }} />
          Late: {displaySummary.late}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.leave }} />
          Leave: {displaySummary.leave}
        </span>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          No classes configured yet
        </div>
      ) : viewMode === 'sections' ? (
        /* ── SECTION VIEW: selected class → sections on X-axis, status bars ── */
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
              interval={0}
              dy={8}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={35}
            />
            <Tooltip content={<SectionTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
            <Bar dataKey="present" name="Present" fill={STATUS_COLORS.present} radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="absent" name="Absent" fill={STATUS_COLORS.absent} radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="late" name="Late" fill={STATUS_COLORS.late} radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="leave" name="Leave" fill={STATUS_COLORS.leave} radius={[4, 4, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        /* ── ALL CLASSES VIEW: classes on X-axis, one bar per section ── */
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={false}
              interval={0}
              dy={8}
              angle={byClass.length > 6 ? -35 : 0}
              textAnchor={byClass.length > 6 ? 'end' : 'middle'}
              height={byClass.length > 6 ? 60 : 40}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={35}
            />
            <Tooltip content={<SectionTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.75rem' }} />
            {sectionNames.map((secName, idx) => (
              <Bar
                key={secName}
                dataKey={secName}
                name={`Sec ${secName}`}
                fill={SECTION_COLORS[idx % SECTION_COLORS.length]}
                radius={[4, 4, 0, 0]}
                barSize={Math.max(12, Math.min(22, 120 / (sectionNames.length * byClass.length)))}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {totalRecords === 0 && chartData.length > 0 && (
        <p className="text-center text-xs text-muted-foreground -mt-2">
          No attendance marked yet today
        </p>
      )}
    </Card>
  )
}
