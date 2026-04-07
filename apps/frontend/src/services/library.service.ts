import { api } from '@/lib/api-client'

export const libraryService = {
    getBooks: (params?: { search?: string; category?: string; page?: number; pageSize?: number }) =>
        api.get<any>('/library/books', { params: params as any }),
    getBook: (id: string) => api.get<any>(`/library/books/${id}`),
    createBook: (data: { title: string; author?: string; isbn?: string; category?: string; totalCopies?: number }) =>
        api.post<any>('/library/books', data),
    updateBook: (id: string, data: any) => api.patch<any>(`/library/books/${id}`, data),
    deleteBook: (id: string) => api.delete<any>(`/library/books/${id}`),
    issueBook: (data: { bookId: string; studentId: string; dueDate: string }) =>
        api.post<any>('/library/issues', data),
    returnBook: (id: string, data?: { fine?: number; remarks?: string }) =>
        api.patch<any>(`/library/issues/${id}/return`, data),
    getIssues: (params?: { status?: string; studentId?: string }) =>
        api.get<any>('/library/issues', { params: params as any }),
}
