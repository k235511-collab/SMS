'use client'

import { type ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ScrollText,
  ClipboardList,
  User,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { 
  UserAvatar, 
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-context'
import { useTheme } from '@/context/theme-context'

// ─── Platform navigation config ─────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const platformNavigation: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/platform',
    icon: LayoutDashboard,
  },
  {
    label: 'Pending Registrations',
    href: '/platform/registrations',
    icon: ClipboardList,
  },
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
  {
    label: 'Settings',
    href: '/platform/settings',
    icon: Settings,
  },
]

// ─── Sidebar nav item ──────────────────────────────────────────

function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || (item.href !== '/platform' && pathname.startsWith(item.href + '/'))
  const isExactActive = pathname === item.href
  const [expanded, setExpanded] = useState(isActive)

  const Icon = item.icon

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-foreground hover:bg-accent',
          )}
        >
          <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary-600" : "text-muted-foreground")} />
          <span className="flex-1 truncate">{item.label}</span>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          />
        </button>
        {expanded && (
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
        'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
        (item.href === '/platform' ? isExactActive : isActive)
          ? 'bg-primary-50 text-primary-700'
          : 'text-foreground hover:bg-accent',
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", (item.href === '/platform' ? isExactActive : isActive) ? "text-primary-600" : "text-muted-foreground")} />
      <span className="flex-1 truncate">{item.label}</span>
    </Link>
  )
}

// ─── Platform layout ───────────────────────────────────────────

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout, isPlatformAdmin, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  // Wait for auth to finish loading before making any redirect decision
  useEffect(() => {
    if (isLoading) return          // still bootstrapping — do nothing
    if (!user) {                   // no session at all → login
      router.replace('/login')
      return
    }
    if (!user.isPlatformAdmin) {   // wrong role → dashboard
      router.replace('/dashboard')
    }
  }, [isLoading, user, router])

  // Show spinner while auth is bootstrapping
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="md" />
          <p className="text-sm text-muted-foreground">Loading platform…</p>
        </div>
      </div>
    )
  }

  // After loading, if not platform admin, render nothing (redirect is in flight)
  if (!user || !user.isPlatformAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size="md" />
      </div>
    )
  }

  return (
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
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/platform" className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-100 border border-primary-200">
              <Shield className="h-5 w-5 text-primary-700" />
            </div>
            <span className="text-sm font-bold text-foreground leading-tight">
              SMS Platform
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {platformNavigation.map((item) => (
              <li key={item.href}>
                <SidebarNavItem item={item} />
              </li>
            ))}
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

          <h1 className="text-sm font-medium text-muted-foreground">Platform Administration</h1>

          {/* Spacer for desktop */}
          <div className="flex-1" />

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
                    Platform Admin
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
                  href="/platform/settings" 
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
  )
}
