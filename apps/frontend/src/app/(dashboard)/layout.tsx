'use client'

import { type ReactNode, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  FileText,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  Bell,
  Calendar,
  Clock,
  ShieldCheck,
  School,
  Trash2,
  User,
  UserCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { cn, getAssetUrl } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { useTheme } from '@/context/theme-context'
import { generatePrimaryScale } from '@/lib/theme'
import { PermissionGate, PlatformOnly } from '@/components/auth'
import { SchoolSwitcher } from '@/components/school-switcher'
import { api } from '@/lib/api-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  UserAvatar,
} from '@/components/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ─── Navigation config ──────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission?: string
  teacherOnly?: boolean  // Show only when user is a teacher
  classTeacherOnly?: boolean  // Show only when user is a class teacher
  children?: NavItem[]
}

const navigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'schools:read',
  },
  // ── Teacher-only items ──
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
  // ── Role-based items ──
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
  {
    label: 'Exams',
    href: '/dashboard/exams',
    icon: FileText,
    permission: 'exams:read',
  },
  {
    label: 'Finance',
    href: '/dashboard/finance',
    icon: DollarSign,
    permission: 'finance:read',
  },
  {
    label: 'Assignments',
    href: '/dashboard/assignments',
    icon: BookOpen,
    permission: 'assignments:read',
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

  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
    permission: 'reports:read',
  },
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
    permission: 'academics:delete', // Only those who can delete should see trash
  },
]

// ─── Sidebar nav item ──────────────────────────────────────────────────────

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  const [expanded, setExpanded] = useState(isActive)

  const Icon = item.icon

  const content = (
    <>
      <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-primary-600' : 'text-muted-foreground')} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate text-left">{item.label}</span>
          {item.children && (
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
          )}
        </>
      )}
    </>
  )

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-foreground hover:bg-accent',
          )}
        >
          {content}
        </button>
        {expanded && !collapsed && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-1.5 text-sm transition-colors',
                  pathname === child.href
                    ? 'font-medium text-primary-700'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-foreground hover:bg-accent',
      )}
    >
      {content}
    </Link>
  )
}

import { SessionProvider } from '@/context/session-context'
import { AcademicYearSwitcher } from '@/components/academic-year-switcher'
import { CampusSwitcher } from '@/components/campus-switcher'

// ─── Dashboard layout ───────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout, updateUser } = useAuth()
  const { theme, setTheme, applySchoolTheme, resetSchoolTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordSaving, setPasswordSaving] = useState(false)

  // ── Sync School Branding ──
  useEffect(() => {
    const branding = user?.schoolSettings?.branding
    if (branding?.primaryColor) {
      const scale = generatePrimaryScale(branding.primaryColor)
      applySchoolTheme(scale)
    } else {
      resetSchoolTheme()
    }
  }, [user?.schoolSettings, applySchoolTheme, resetSchoolTheme])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/notifications/my/unread-count')
      if (res.success && res.data != null) {
        const d = res.data
        if (typeof d === 'number') {
          setUnreadCount(d)
        } else if (typeof d === 'object' && d !== null && 'count' in d) {
          setUnreadCount(Number((d as Record<string, unknown>).count) || 0)
        }
      }
    } catch (_e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [fetchUnread])

  const handleForcedPasswordChange = useCallback(async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setPasswordSaving(true)
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      })
      if (res.success) {
        toast.success('Password changed')
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
        updateUser({ mustChangePassword: false })
      } else {
        toast.error(res.message || 'Failed to change password')
      }
    } finally {
      setPasswordSaving(false)
    }
  }, [passwords, updateUser])

  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-background">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card border-r border-border/50 transition-transform lg:translate-x-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* School branding */}
          <div className="flex h-16 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-100 border border-primary-200">
                {user?.schoolLogo ? (
                  <img
                    src={getAssetUrl(user.schoolLogo)}
                    alt={user.schoolName || 'School'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <School className="h-5 w-5 text-primary-700" />
                )}
              </div>
              <span className="text-sm font-bold text-foreground leading-tight">
                {user?.schoolName || 'School'}
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Platform admin link */}
          <PlatformOnly>
            <div className="border-b border-border px-3 py-2">
              <Link
                href="/dashboard/platform"
                className="flex items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700"
              >
                <Shield className="h-4 w-4" />
                Platform Admin
              </Link>
            </div>
          </PlatformOnly>

          {/* School switcher (only shows if user has multiple schools) */}
          <SchoolSwitcher />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                // Skip teacher-only items if user is not a teacher
                if (item.teacherOnly && !user?.teacherId) return null
                // Hide class-teacher-only items for subject-only teachers
                if (item.classTeacherOnly && user?.teacherId && !user?.classTeacherOfId) return null
                // Hide Dashboard from teachers – they get My Classes instead
                if (item.href === '/dashboard' && user?.teacherId) return null

                const navItem = (
                  <li key={item.href}>
                    <SidebarNavItem item={item} collapsed={false} />
                  </li>
                )

                if (item.permission) {
                  return (
                    <PermissionGate key={item.href} permission={item.permission}>
                      {navItem}
                    </PermissionGate>
                  )
                }

                return navItem
              })}
            </ul>
          </nav>

        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col lg:ml-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-md px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* School name in header (visible on mobile when sidebar is hidden) */}
            <div className="flex-1 lg:hidden">
              {user?.schoolName && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-100 border border-primary-200">
                    {user.schoolLogo ? (
                      <img src={getAssetUrl(user.schoolLogo)} alt={user.schoolName} className="h-full w-full object-cover" />
                    ) : (
                      <School className="h-4 w-4 text-primary-700" />
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground truncate">{user.schoolName}</span>
                </div>
              )}
            </div>

            {/* Spacer for desktop */}
            <div className="hidden lg:block flex-1" />

            {/* Campus & Year switchers */}
            <CampusSwitcher />
            <AcademicYearSwitcher />

            {/* Notification bell */}
            <Link
              href="/dashboard/notifications"
              className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-full pl-1.5 pr-4 py-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300 outline-none group border border-transparent hover:border-border/30 active:scale-95">
                  <UserAvatar
                    src={user?.avatar}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    size="md"
                    showOnline={true}
                    className="ring-2 ring-transparent group-hover:ring-primary-500/20 transition-all"
                  />
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold text-foreground group-hover:text-primary-600 transition-colors">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                      {user?.role?.replace('_', ' ')}
                    </span>
                  </div>
                  <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground transition-all duration-300 group-data-[state=open]:rotate-180 group-hover:text-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-64 p-2 mt-2 bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="px-3 py-3 mb-2 rounded-xl bg-primary-500/5 border border-primary-500/10">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      src={user?.avatar}
                      firstName={user?.firstName}
                      lastName={user?.lastName}
                      size="lg"
                      className="ring-4 ring-background shadow-sm"
                    />
                    <div className="flex flex-col min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{user?.firstName} {user?.lastName}</p>
                      <p className="text-[12px] text-muted-foreground truncate leading-relaxed">{user?.email}</p>
                    </div>
                  </div>
                </div>
                
                <DropdownMenuItem asChild>
                  <Link 
                    href={user?.teacherId ? '/dashboard/my-profile' : '/dashboard/settings'} 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all focus:bg-primary-50 focus:text-primary-700 group hover:translate-x-1"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 group-focus:bg-primary-600 group-focus:text-white transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">My Profile</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link 
                    href="/dashboard/settings" 
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all focus:bg-primary-50 focus:text-primary-700 group hover:translate-x-1"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 group-focus:bg-orange-600 group-focus:text-white transition-colors">
                      <Settings className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">Account Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all focus:bg-primary-50 focus:text-primary-700 group outline-none">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 group-focus:bg-violet-600 group-focus:text-white transition-colors">
                      {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium">Appearance</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent className="w-40 p-1 bg-background/95 backdrop-blur-xl border-border/40 shadow-2xl animate-in slide-in-from-right-1">
                      <DropdownMenuItem onClick={() => setTheme('light')} className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer focus:bg-primary-50">
                        <Sun className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Light</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('dark')} className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer focus:bg-primary-50">
                        <Moon className="h-4 w-4 text-violet-500" />
                        <span className="text-sm font-medium">Dark</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTheme('system')} className="flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer focus:bg-primary-50">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">System</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="my-2 opacity-40" />
                
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-3 px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg transition-all group hover:bg-destructive/5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive group-focus:bg-destructive group-focus:text-white transition-colors">
                    <LogOut className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-sm font-semibold">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Page content */}
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>

      <Dialog open={!!user?.mustChangePassword && !user?.isPlatformAdmin}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change your temporary password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Your administrator reset your password. You must set a new password to continue.
          </p>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Current temporary password</Label>
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((prev) => ({ ...prev, currentPassword: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>New password</Label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleForcedPasswordChange}
              disabled={
                passwordSaving ||
                !passwords.currentPassword ||
                !passwords.newPassword ||
                !passwords.confirmPassword
              }
            >
              {passwordSaving ? 'Changing...' : 'Update password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SessionProvider>
  )
}
