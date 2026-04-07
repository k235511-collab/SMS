'use client'

import Link from 'next/link'
import {
  UserPlus,
  ClipboardCheck,
  DollarSign,
  FileBarChart,
  BookOpen,
  CalendarDays,
  Bus,
  GraduationCap,
} from 'lucide-react'
import { PermissionGate } from '@/components/auth'

interface QuickAction {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  permission: string
}

const actions: QuickAction[] = [
  {
    label: 'New Admission',
    href: '/dashboard/students?action=add',
    icon: UserPlus,
    color: 'bg-blue-500 hover:bg-blue-600',
    permission: 'students:create',
  },
  {
    label: 'Mark Attendance',
    href: '/dashboard/attendance',
    icon: ClipboardCheck,
    color: 'bg-emerald-500 hover:bg-emerald-600',
    permission: 'attendance:create',
  },
  {
    label: 'Fee Collection',
    href: '/dashboard/finance',
    icon: DollarSign,
    color: 'bg-amber-500 hover:bg-amber-600',
    permission: 'finance:read',
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: FileBarChart,
    color: 'bg-rose-500 hover:bg-rose-600',
    permission: 'analytics:read',
  },
  {
    label: 'Manage Classes',
    href: '/dashboard/academics/classes',
    icon: BookOpen,
    color: 'bg-violet-500 hover:bg-violet-600',
    permission: 'academics:read',
  },
  {
    label: 'Calendar',
    href: '/dashboard/calendar',
    icon: CalendarDays,
    color: 'bg-cyan-500 hover:bg-cyan-600',
    permission: 'calendar:read',
  },
  {
    label: 'Academics',
    href: '/dashboard/academics',
    icon: GraduationCap,
    color: 'bg-indigo-500 hover:bg-indigo-600',
    permission: 'academics:read',
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <PermissionGate key={action.label} permission={action.permission}>
              <Link
                href={action.href}
                className={`flex flex-col items-center gap-2 rounded-lg px-3 py-4 text-white text-xs font-semibold shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${action.color}`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-tight">{action.label}</span>
              </Link>
            </PermissionGate>
          )
        })}
      </div>
    </div>
  )
}
