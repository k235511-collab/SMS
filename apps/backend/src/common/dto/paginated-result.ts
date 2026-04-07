export class PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }

  constructor(data: T[], total: number, page: number, pageSize: number) {
    this.data = data
    this.meta = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    }
  }
}
