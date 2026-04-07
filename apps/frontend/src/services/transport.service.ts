import { api } from '@/lib/api-client'

export const transportService = {
    getVehicles: () => api.get<any>('/transport/vehicles'),
    getVehicle: (id: string) => api.get<any>(`/transport/vehicles/${id}`),
    createVehicle: (data: any) => api.post<any>('/transport/vehicles', data),
    updateVehicle: (id: string, data: any) => api.patch<any>(`/transport/vehicles/${id}`, data),
    deleteVehicle: (id: string) => api.delete<any>(`/transport/vehicles/${id}`),
    getRoutes: () => api.get<any>('/transport/routes'),
    getRoute: (id: string) => api.get<any>(`/transport/routes/${id}`),
    createRoute: (data: any) => api.post<any>('/transport/routes', data),
    updateRoute: (id: string, data: any) => api.patch<any>(`/transport/routes/${id}`, data),
    deleteRoute: (id: string) => api.delete<any>(`/transport/routes/${id}`),
    assignStudent: (data: { routeId: string; studentId: string; stopName?: string }) =>
        api.post<any>('/transport/assignments', data),
    removeAssignment: (id: string) => api.delete<any>(`/transport/assignments/${id}`),
}
