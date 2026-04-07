/** User entity interface — aligned with Prisma User model */
export interface IUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  roleId: string
  schoolId: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

/** DTO for creating a user */
export interface CreateUserDto {
  email: string
  password: string
  firstName: string
  lastName: string
  roleId: string
  phone?: string
}

/** DTO for updating a user */
export interface UpdateUserDto {
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  roleId?: string
  isActive?: boolean
}
