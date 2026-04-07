'use client'

import { MapPin, Lock } from 'lucide-react'
import { useSession } from '@/context/session-context'

/**
 * Shows the active campus name inside form dialogs so users know
 * which campus the entity will be assigned to.
 *
 * - If campus-locked → shows lock icon + campus name
 * - If a campus is selected → shows pin icon + campus name
 * - If "All Campuses" (no campus selected) → shows "School-wide (no campus)"
 * - If only 1 campus exists → hidden
 */
export function CampusBadge() {
    const { campuses, selectedCampus, isCampusLocked } = useSession()

    // Nothing to show if school has 0-1 campuses
    if (campuses.length <= 1) return null

    const Icon = isCampusLocked ? Lock : MapPin

    return (
        <div className="flex items-center gap-1.5 rounded-md bg-muted/60 border border-border px-2.5 py-1 text-xs text-muted-foreground">
            <Icon className="h-3 w-3 shrink-0" />
            <span>
                {selectedCampus
                    ? selectedCampus.name
                    : 'School-wide (no campus filter)'}
            </span>
        </div>
    )
}
