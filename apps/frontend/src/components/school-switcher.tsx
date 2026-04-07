'use client'

import { useState, useEffect, useCallback } from 'react'
import { authService, type SchoolSwitchItem } from '@/services/auth.service'
import { useAuth } from '@/context/auth-context'
import { cn } from '@/lib/utils'
import { ChevronsUpDown, Check, School, Loader2 } from 'lucide-react'

export function SchoolSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { user, switchSchool } = useAuth()
  const [schools, setSchools] = useState<SchoolSwitchItem[]>([])
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchSchools = useCallback(async () => {
    try {
      const result = await authService.getMySchools()
      setSchools(result.schools)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  // Don't show if user only has 1 school
  if (loading || schools.length <= 1) return null

  const currentSchool = schools.find((s) => s.isCurrent)

  const handleSwitch = async (school: SchoolSwitchItem) => {
    if (school.isCurrent || switching) return
    setSwitching(true)
    try {
      await switchSchool(school.schoolId)
      // Full page reload to re-bootstrap with new tokens
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Failed to switch school:', err)
      setSwitching(false)
    }
  }

  if (collapsed) return null

  return (
    <div className="relative border-b border-border px-3 py-2">
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className={cn(
          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          'bg-accent/50 text-foreground hover:bg-accent',
        )}
      >
        <School className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate text-left">
          {switching ? 'Switching...' : currentSchool?.schoolName || user?.schoolName || 'Select School'}
        </span>
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && !switching && (
        <>
          {/* Click outside to close */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full z-50 mt-1 rounded-lg border border-border bg-popover shadow-lg">
            <div className="p-1">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Switch School
              </p>
              {schools.map((school) => (
                <button
                  key={school.schoolId}
                  onClick={() => {
                    setOpen(false)
                    handleSwitch(school)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                    school.isCurrent
                      ? 'bg-accent font-medium text-foreground'
                      : 'text-foreground hover:bg-accent/50',
                  )}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary"
                  >
                    {school.schoolName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 truncate text-left">
                    <p className="truncate text-sm">{school.schoolName}</p>
                    <p className="truncate text-xs text-muted-foreground capitalize">
                      {school.role}
                    </p>
                  </div>
                  {school.isCurrent && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
