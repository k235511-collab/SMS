/** Student entity interface — aligned with Prisma Student model */
export interface IStudent {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  bloodGroup?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  address?: string
  enrollmentDate: string
  isActive: boolean
  schoolId: string
  userId?: string
  createdAt: string
  updatedAt: string
}

/** DTO for enrolling a student */
export interface EnrollStudentDto {
  rollNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  bloodGroup?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  address?: string
  userId?: string
}

/** DTO for updating student details */
export interface UpdateStudentDto {
  rollNumber?: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  bloodGroup?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  address?: string
  isActive?: boolean
}
