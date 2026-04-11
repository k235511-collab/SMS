'use client'

import { type ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeftOpen,
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
import { platformNavigationSections, type NavigationItem } from '@/lib/navigation'

const PLATFORM_SIDEBAR_PREF_KEY = 'sms.platform.sidebar.collapsed'

function isPlatformNavItemActive(pathname: string, item: NavigationItem) {
  if (item.exactMatch) {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

// ─── Sidebar nav item ──────────────────────────────────────────

function SidebarNavItem({ item, collapsed }: { item: NavigationItem; collapsed: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const isActive = isPlatformNavItemActive(pathname, item)
  const [expanded, setExpanded] = useState(isActive)

  useEffect(() => {
    if (isActive) {
      setExpanded(true)
    }
  }, [isActive])

  const Icon = item.icon

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            if (collapsed) {
              router.push(item.href)
              return
            }
            setExpanded(!expanded)
          }}
          title={collapsed ? item.label : undefined}
          className={cn(
            'flex w-full items-center rounded-lg text-left text-sm font-medium transition-all duration-300 ease-out',
            collapsed ? 'justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2',
            isActive
              ? 'bg-primary-50 text-primary-700'
              : 'text-foreground hover:bg-accent',
          )}
        >
          <Icon
            className={cn(
              'h-5 w-5 shrink-0 transition-colors duration-300',
              isActive ? 'text-primary-600' : 'text-muted-foreground',
            )}
          />
          <span
            className={cn(
              'flex-1 overflow-hidden whitespace-nowrap transition-all duration-200 ease-out',
              collapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100',
            )}
          >
            {item.label}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 ease-out',
              collapsed ? 'w-0 opacity-0' : 'w-4 opacity-100',
              expanded && !collapsed && 'rotate-180',
            )}
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
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-all duration-300 ease-out',
        collapsed ? 'justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2 text-left',
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-foreground hover:bg-accent',
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors duration-300',
          isActive ? 'text-primary-600' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'flex-1 overflow-hidden whitespace-nowrap transition-all duration-200 ease-out',
          collapsed ? 'max-w-0 opacity-0' : 'max-w-[12rem] opacity-100',
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}

// ─── Platform layout ───────────────────────────────────────────

export default function PlatformLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const { user, logout, isLoading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const sidebarCollapsed = isDesktop && desktopSidebarCollapsed

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const stored = window.localStorage.getItem(PLATFORM_SIDEBAR_PREF_KEY)
    if (stored != null) {
      setDesktopSidebarCollapsed(stored === '1')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(PLATFORM_SIDEBAR_PREF_KEY, desktopSidebarCollapsed ? '1' : '0')
  }, [desktopSidebarCollapsed])

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
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/50 bg-card transition-[width,transform] duration-500 ease-in-out lg:translate-x-0',
          sidebarCollapsed ? 'w-64 lg:w-[4.5rem]' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex h-16 items-center justify-between border-b border-border/50',
            sidebarCollapsed ? 'px-2 lg:px-3' : 'px-4',
          )}
        >
          <Link
            href="/platform"
            className={cn(
              'flex min-w-0 items-center transition-all duration-300 ease-out',
              sidebarCollapsed ? 'justify-center gap-0 lg:w-full' : 'gap-3',
            )}
            title={sidebarCollapsed ? 'SMS Platform' : undefined}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-100 border border-primary-200">
              <Shield className="h-5 w-5 text-primary-700" />
            </div>
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap text-sm font-bold leading-tight text-foreground transition-all duration-200 ease-out',
                sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-[11rem] opacity-100',
              )}
            >
              SMS Platform
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-1 text-muted-foreground hover:text-foreground lg:hidden"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setDesktopSidebarCollapsed((prev) => !prev)}
              className={cn(
                'hidden rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:inline-flex',
                sidebarCollapsed && 'lg:hidden',
              )}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setDesktopSidebarCollapsed(false)}
            className="absolute -right-2 top-16 z-20 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-accent hover:text-foreground lg:flex"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto py-4 transition-[padding] duration-300 ease-out',
            sidebarCollapsed ? 'px-2' : 'px-3',
          )}
        >
          <div className="space-y-4">
            {platformNavigationSections.map((section) => (
              <section key={section.label} className="space-y-1">
                <p
                  className={cn(
                    'overflow-hidden whitespace-nowrap px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80 transition-all duration-200 ease-out',
                    sidebarCollapsed ? 'max-h-0 pb-0 opacity-0' : 'max-h-6 pb-1 opacity-100',
                  )}
                >
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <SidebarNavItem item={item} collapsed={sidebarCollapsed} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          'flex flex-1 flex-col transition-[margin] duration-500 ease-in-out',
          sidebarCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-64',
        )}
      >
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
              <button className="group flex items-center gap-3 rounded-full border border-transparent pl-1.5 pr-4 py-1.5 outline-none transition-all duration-200 ease-out hover:border-border/30 hover:bg-black/5 active:scale-[0.98] dark:hover:bg-white/5">
                <UserAvatar
                  src={user?.avatar}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="md"
                  showOnline={true}
                  className="ring-2 ring-transparent transition-all duration-200 ease-out group-hover:ring-primary-500/20"
                />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-sm font-semibold text-foreground transition-colors duration-200 ease-out group-hover:text-primary-600">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                    Platform Admin
                  </span>
                </div>
                <ChevronDown className="hidden sm:block h-4 w-4 text-muted-foreground transition-all duration-200 ease-out group-data-[state=open]:rotate-180 group-hover:text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="mt-2 w-64 origin-top-right border-border/40 bg-background/95 p-2 shadow-2xl backdrop-blur-xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 data-[state=open]:zoom-in-95 duration-200 ease-out"
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
                  className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ease-out focus:bg-primary-50 focus:text-primary-700"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 transition-colors duration-200 ease-out group-focus:bg-orange-600 group-focus:text-white">
                    <Settings className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Account Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none transition-all duration-200 ease-out focus:bg-primary-50 focus:text-primary-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 transition-colors duration-200 ease-out group-focus:bg-violet-600 group-focus:text-white">
                    {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium">Appearance</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-40 border-border/40 bg-background/95 p-1 shadow-2xl backdrop-blur-xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-1 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-1 data-[state=open]:zoom-in-95 duration-200 ease-out">
                    <DropdownMenuItem onClick={() => setTheme('light')} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors duration-200 ease-out focus:bg-primary-50">
                      <Sun className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors duration-200 ease-out focus:bg-primary-50">
                      <Moon className="h-4 w-4 text-violet-500" />
                      <span className="text-sm font-medium">Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 transition-colors duration-200 ease-out focus:bg-primary-50">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">System</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator className="my-2 opacity-40" />
              
              <DropdownMenuItem
                onClick={logout}
                className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-destructive transition-all duration-200 ease-out hover:bg-destructive/5 focus:bg-destructive/10 focus:text-destructive"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors duration-200 ease-out group-focus:bg-destructive group-focus:text-white">
                  <LogOut className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
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
