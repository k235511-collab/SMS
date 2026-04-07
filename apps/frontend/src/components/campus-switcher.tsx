'use client'

import { MapPin, ChevronDown, Check, Lock } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { useAuth } from '@/context/auth-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function CampusSwitcher() {
    const { campuses, selectedCampus, selectCampus, isLoading, isCampusLocked } = useSession()
    const { user } = useAuth()

    const isSuperAdmin = user?.role === 'super_admin' || user?.isPlatformAdmin

    // Hide if loading, or if school has 0-1 campuses AND user is NOT an admin
    if (isLoading) return null
    if (campuses.length <= 1 && !isSuperAdmin) return null

    // Campus-locked user: show a static badge (no dropdown)
    if (isCampusLocked && selectedCampus) {
        return (
            <div className="hidden h-9 items-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-sm font-medium text-muted-foreground lg:flex">
                <Lock className="h-3.5 w-3.5" />
                <span className="truncate max-w-36">{selectedCampus.name}</span>
            </div>
        )
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="hidden h-9 w-auto gap-2 px-3 lg:flex bg-background border-border hover:bg-accent hover:text-accent-foreground"
                >
                    <MapPin className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium truncate max-w-[140px]">
                        {selectedCampus ? selectedCampus.name : 'All Campuses'}
                    </span>
                    <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                    Campus
                    <div className="text-xs font-normal text-muted-foreground">
                        Filter data by campus
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => selectCampus(null)}
                    className="flex items-center justify-between cursor-pointer"
                >
                    <span>All Campuses</span>
                    {!selectedCampus && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
                {campuses.map((campus) => (
                    <DropdownMenuItem
                        key={campus.id}
                        onClick={() => selectCampus(campus.id)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <span>{campus.name}</span>
                        {selectedCampus?.id === campus.id && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
