/** Represents a school (tenant) in the multi-tenant system — aligned with Prisma School model */
export interface ISchool {
  id: string
  name: string
  slug: string
  code: string
  domain?: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  settings?: Record<string, unknown>
  isActive: boolean
  subscriptionPlanId?: string
  createdAt: string
  updatedAt: string
}

/** DTO for creating a new school */
export interface CreateSchoolDto {
  name: string
  slug: string
  code: string
  domain?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  subscriptionPlanId?: string
}

/** DTO for updating school details */
export interface UpdateSchoolDto {
  name?: string
  domain?: string
  logo?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  settings?: Record<string, unknown>
  subscriptionPlanId?: string
  isActive?: boolean
}

/** @deprecated Use ISchool instead */
export type ITenant = ISchool
