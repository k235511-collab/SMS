import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileText,
  DollarSign,
  Settings,
  Clock,
  Bell,
  Calendar,
  ShieldCheck,
  Trash2,
  UserCircle,
  Building2,
  CreditCard,
  BarChart3,
  ScrollText,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react'
import type { PermissionSlug } from '@/lib/auth-types'

export interface NavigationItem {
  label: string
  href: string
  icon: LucideIcon
  permission?: PermissionSlug
  teacherOnly?: boolean
  classTeacherOnly?: boolean
  exactMatch?: boolean
  children?: NavigationItem[]
}

export interface NavigationSection {
  label: string
  items: NavigationItem[]
}

export const dashboardNavigationSections: NavigationSection[] = [
  {
    label: 'Home',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permission: 'schools:read',
      },
      {
        label: 'My Classes',
        href: '/dashboard/my-classes',
        icon: BookOpen,
        teacherOnly: true,
      },
      {
        label: 'My Profile',
        href: '/dashboard/my-profile',
        icon: UserCircle,
        teacherOnly: true,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        label: 'Users',
        href: '/dashboard/users',
        icon: Users,
        permission: 'users:read',
      },
      {
        label: 'Roles',
        href: '/dashboard/roles',
        icon: ShieldCheck,
        permission: 'roles:read',
      },
      {
        label: 'Students',
        href: '/dashboard/students',
        icon: GraduationCap,
        permission: 'students:read',
      },
      {
        label: 'Teachers',
        href: '/dashboard/teachers',
        icon: Users,
        permission: 'teachers:read',
      },
      {
        label: 'Parents',
        href: '/dashboard/parents',
        icon: Users,
        permission: 'parents:read',
      },
    ],
  },
  {
    label: 'Academics',
    items: [
      {
        label: 'Academics',
        href: '/dashboard/academics',
        icon: BookOpen,
        permission: 'academics:read',
        children: [
          { label: 'Classes', href: '/dashboard/academics/classes', icon: BookOpen },
          { label: 'Subjects', href: '/dashboard/academics/subjects', icon: BookOpen },
        ],
      },
      {
        label: 'Timetable',
        href: '/dashboard/timetable',
        icon: Clock,
        permission: 'timetable:read',
      },
      {
        label: 'Attendance',
        href: '/dashboard/attendance',
        icon: ClipboardCheck,
        permission: 'attendance:read',
        classTeacherOnly: true,
      },
    ],
  },
  {
    label: 'Assessment',
    items: [
      {
        label: 'Exams',
        href: '/dashboard/exams',
        icon: FileText,
        permission: 'exams:read',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Finance',
        href: '/dashboard/finance',
        icon: DollarSign,
        permission: 'finance:read',
      },
      {
        label: 'Calendar',
        href: '/dashboard/calendar',
        icon: Calendar,
        permission: 'calendar:read',
      },
      {
        label: 'Communications',
        href: '/dashboard/communications',
        icon: Bell,
        permission: 'communications:read',
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Reports',
        href: '/dashboard/reports',
        icon: FileText,
        permission: 'reports:read',
        children: [
          { label: 'Student Report Card', href: '/dashboard/reports/student-report-card', icon: Users },
          { label: 'Class Report', href: '/dashboard/reports/class-report', icon: GraduationCap },
          { label: 'Attendance Report', href: '/dashboard/reports/attendance-report', icon: ClipboardCheck },
          { label: 'Financial Report', href: '/dashboard/reports/financial-report', icon: DollarSign },
        ],
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Settings',
        href: '/dashboard/settings',
        icon: Settings,
        permission: 'schools:read',
      },
      {
        label: 'Trash',
        href: '/dashboard/trash',
        icon: Trash2,
        permission: 'academics:delete',
      },
    ],
  },
]

export const platformNavigationSections: NavigationSection[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/platform',
        icon: LayoutDashboard,
        exactMatch: true,
      },
      {
        label: 'Pending Registrations',
        href: '/platform/registrations',
        icon: ClipboardList,
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        label: 'Schools',
        href: '/platform/schools',
        icon: Building2,
      },
      {
        label: 'Subscriptions',
        href: '/platform/plans',
        icon: CreditCard,
      },
      {
        label: 'Platform Users',
        href: '/platform/admins',
        icon: Users,
      },
    ],
  },
  {
    label: 'Insights',
    items: [
      {
        label: 'Analytics',
        href: '/platform/analytics',
        icon: BarChart3,
      },
      {
        label: 'Audit Logs',
        href: '/platform/audit',
        icon: ScrollText,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        label: 'Settings',
        href: '/platform/settings',
        icon: Settings,
      },
    ],
  },
]
