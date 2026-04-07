/** Standard paginated response */
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

/** Pagination query params */
export interface PaginationQuery {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

/** Filter for school-scoped queries */
export interface SchoolScopedQuery extends PaginationQuery {
  schoolId: string
}

/** @deprecated Use SchoolScopedQuery instead */
export type TenantScopedQuery = SchoolScopedQuery
