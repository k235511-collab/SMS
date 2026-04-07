export interface AcademicYear {
    id: string
    name: string
    startDate: string // ISO date string
    endDate: string   // ISO date string
    isCurrent: boolean
    isActive: boolean
    schoolId: string
    createdAt: string
    updatedAt: string
}
