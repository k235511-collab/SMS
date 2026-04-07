'use client'

import { Calendar, ChevronDown, Check } from 'lucide-react'
import { useSession } from '@/context/session-context'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function AcademicYearSwitcher() {
    const { selectedYear, academicYears, selectYear, isLoading } = useSession()

    if (isLoading) return null
    if (!selectedYear) return null

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="hidden h-9 w-auto gap-2 px-3 lg:flex bg-background border-border hover:bg-accent hover:text-accent-foreground"
                >
                    <Calendar className="mr-1 h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                        {selectedYear.name}
                        {selectedYear.isCurrent && <span className="ml-1 text-xs text-muted-foreground">(Current)</span>}
                    </span>
                    <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                    Academic Session
                    <div className="text-xs font-normal text-muted-foreground">
                        Select to view historical data
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {academicYears.map((year) => (
                    <DropdownMenuItem
                        key={year.id}
                        onClick={() => selectYear(year.id)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <span>{year.name}</span>
                        {selectedYear.id === year.id && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
