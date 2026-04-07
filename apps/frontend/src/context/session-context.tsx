'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    useMemo,
    type ReactNode,
} from 'react'
import Cookies from 'js-cookie'
import { api } from '@/lib/api-client'
import type { AcademicYear } from '@/lib/types'
import { useAuth } from './auth-context'

interface SimpleCampus {
    id: string
    name: string
    code: string
}

// Roles that are NOT campus-locked (can switch freely)
const FREE_CAMPUS_ROLES = ['super_admin', 'admin']

interface SessionContextValue {
    selectedYear: AcademicYear | null
    academicYears: AcademicYear[]
    isLoading: boolean
    securityCheck: boolean // ensuring user belongs to school first
    selectYear: (yearId: string) => void
    refreshYears: () => void
    // Campus
    campuses: SimpleCampus[]
    selectedCampus: SimpleCampus | null
    selectCampus: (campusId: string | null) => void
    /** True when the logged-in user is locked to their assigned campus */
    isCampusLocked: boolean
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

const SESSION_COOKIE_KEY = 'sms_selected_year_id'
const CAMPUS_COOKIE_KEY = 'sms_selected_campus_id'

export function SessionProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
    const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Campus state
    const [campuses, setCampuses] = useState<SimpleCampus[]>([])
    const [selectedCampus, setSelectedCampus] = useState<SimpleCampus | null>(null)
    const [yearRefreshKey, setYearRefreshKey] = useState(0)

    const refreshYears = useCallback(() => {
        setYearRefreshKey((k) => k + 1)
    }, [])

    const normalizeCampusList = useCallback((payload: unknown): SimpleCampus[] => {
        if (Array.isArray(payload)) {
            return payload as SimpleCampus[]
        }

        if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
            return (payload as any).data as SimpleCampus[]
        }

        return []
    }, [])

    // Fetch years when user logs in, school changes, or campus changes
    useEffect(() => {
        if (!user?.schoolId) return

        let cancelled = false
        setIsLoading(true)

        async function fetchYears() {
            try {
                // Fetch all active years (now campus-scoped via x-campus-id header)
                const res = await api.get<{ data: AcademicYear[] }>('/academic-years?pageSize=100&sortOrder=desc')

                if (cancelled) return

                if (res.success && res.data) {
                    // Handle paginated response structure
                    const years = Array.isArray(res.data)
                        ? res.data
                        : (res.data as any).data || []

                    setAcademicYears(years)

                    // Determine which year to select
                    const cookieYearId = Cookies.get(SESSION_COOKIE_KEY)
                    const targetYear = years.find((y: AcademicYear) => y.id === cookieYearId) ||
                        years.find((y: AcademicYear) => y.isCurrent) ||
                        years[0] ||
                        null

                    setSelectedYear(targetYear)

                    if (targetYear && targetYear.id !== cookieYearId) {
                        // Sync cookie if we fell back to default
                        Cookies.set(SESSION_COOKIE_KEY, targetYear.id, { expires: 365 })
                    }
                }
            } catch (err) {
                console.error('Failed to load academic years', err)
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        fetchYears()

        return () => {
            cancelled = true
        }
    }, [user?.schoolId, yearRefreshKey])

    // Fetch campuses
    useEffect(() => {
        if (!user?.schoolId) return
        let cancelled = false

        // Determine if user is campus-locked
        const locked = !!user.campusId && !user.isPlatformAdmin && !FREE_CAMPUS_ROLES.includes(user.role ?? '')

        async function fetchCampuses() {
            try {
                let list: SimpleCampus[] = []
                let loaded = false

                const res = await api.get<SimpleCampus[]>('/campuses/all')
                if (cancelled) return

                if (res.success && res.data) {
                    list = normalizeCampusList(res.data)
                    loaded = true
                }

                // Fallback for environments still serving the older backend build
                // where /campuses/all may be missing or may not return the simple array shape.
                if (list.length === 0) {
                    const fallbackRes = await api.get<{ data: SimpleCampus[] }>('/campuses', {
                        params: { pageSize: 100, sortBy: 'name', sortOrder: 'asc' },
                    })

                    if (cancelled) return

                    if (fallbackRes.success && fallbackRes.data) {
                        list = normalizeCampusList(fallbackRes.data)
                        loaded = true
                    }
                }

                if (loaded) {
                    setCampuses(list)

                    if (locked && user!.campusId) {
                        // Campus-locked user: force their assigned campus
                        const lockedCampus = list.find((c) => c.id === user!.campusId) || null
                        setSelectedCampus(lockedCampus)
                        if (lockedCampus) {
                            Cookies.set(CAMPUS_COOKIE_KEY, lockedCampus.id, { expires: 365 })
                        }
                    } else {
                        // Free user (admin/super_admin): restore from cookie
                        const cookieCampusId = Cookies.get(CAMPUS_COOKIE_KEY)
                        if (list.length > 0) {
                            const target = list.find((c) => c.id === cookieCampusId) || null
                            setSelectedCampus(target) // null means "All Campuses"
                        }
                    }
                    console.log('[DEBUG] CampusSwitcher fetched campuses:', list.length, 'locked:', locked, 'user:', user?.email)
                } else {
                    console.warn('[DEBUG] fetchCampuses failed or no data:', res)
                }
            } catch (err) {
                console.error('[DEBUG] fetchCampuses error:', err)
            }
        }

        fetchCampuses()
        return () => { cancelled = true }
    }, [user?.schoolId, user?.campusId, user?.role, user?.isPlatformAdmin])

    const selectYear = (yearId: string) => {
        const year = academicYears.find((y) => y.id === yearId)
        if (year) {
            setSelectedYear(year)
            Cookies.set(SESSION_COOKIE_KEY, year.id, { expires: 365 })
        }
    }

    const selectCampus = (campusId: string | null) => {
        // Prevent campus-locked users from switching
        if (user?.campusId && !user.isPlatformAdmin && !FREE_CAMPUS_ROLES.includes(user.role ?? '')) {
            return // no-op for locked users
        }

        if (campusId === null) {
            // Sync cookie first so the next API call (fetchYears) reads the right campus
            Cookies.remove(CAMPUS_COOKIE_KEY)
            setSelectedCampus(null)
        } else {
            const campus = campuses.find((c) => c.id === campusId)
            if (campus) {
                // Sync cookie first so the next API call (fetchYears) reads the right campus
                Cookies.set(CAMPUS_COOKIE_KEY, campus.id, { expires: 365 })
                setSelectedCampus(campus)
            }
        }
    }

    // Year auto-selection on campus change is handled by fetchYears effect:
    // When selectedCampus changes → fetchYears runs → gets new campus's years →
    // old cookie year won't match → falls back to isCurrent → first year.
    // No separate effect needed (it caused a race with stale academicYears).

    const isCampusLocked = useMemo(() => {
        // Platform admins and Super Admins are NEVER locked
        if (user?.isPlatformAdmin) return false
        if (user?.role === 'super_admin') return false

        // If they don't have a campusId, they aren't locked to anything
        if (!user?.campusId) return false

        // Otherwise, lock them if they aren't in the FREE_CAMPUS_ROLES
        return !FREE_CAMPUS_ROLES.includes(user.role ?? '')
    }, [user])

    const value = useMemo(
        () => ({
            selectedYear,
            academicYears,
            isLoading,
            securityCheck: !!user,
            selectYear,
            refreshYears,
            campuses,
            selectedCampus,
            selectCampus,
            isCampusLocked,
        }),
        [selectedYear, academicYears, isLoading, user, campuses, selectedCampus, isCampusLocked, refreshYears]
    )

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error('useSession must be used within a <SessionProvider>')
    }
    return context
}
