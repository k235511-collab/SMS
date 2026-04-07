'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { transportService } from '@/services/transport.service'
import { AddVehicleDialog } from '@/components/forms/add-vehicle-dialog'
import { Bus, MapPin, Users, Truck } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface Vehicle { id: string; registrationNo: string; type?: string; capacity?: number; driver?: string; transportRoutes?: any[] }
interface Route { id: string; name: string; pickupTime?: string; dropTime?: string; vehicle?: { registrationNo: string }; _count?: { transportAssignments: number } }

export default function TransportPage() {
    const { selectedCampus } = useSession()
    const [tab, setTab] = useState<'vehicles' | 'routes'>('vehicles')
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [routes, setRoutes] = useState<Route[]>([])
    const [loading, setLoading] = useState(false)

    const fetchVehicles = useCallback(async () => {
        setLoading(true)
        const res = await transportService.getVehicles()
        if (res.success && res.data) setVehicles(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [selectedCampus])

    const fetchRoutes = useCallback(async () => {
        setLoading(true)
        const res = await transportService.getRoutes()
        if (res.success && res.data) setRoutes(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [selectedCampus])

    useEffect(() => { if (tab === 'vehicles') fetchVehicles(); else fetchRoutes() }, [tab, fetchVehicles, fetchRoutes])

    return (
        <ProtectedRoute permission="transport:read">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Bus className="h-6 w-6" /> Transport
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage vehicles, routes, and student assignments</p>
                    </div>
                    <div className="flex gap-2">
                        {tab === 'vehicles' && <AddVehicleDialog onSuccess={fetchVehicles} />}
                        <Button variant={tab === 'vehicles' ? 'primary' : 'outline'} onClick={() => setTab('vehicles')}>
                            <Truck className="mr-2 h-4 w-4" /> Vehicles
                        </Button>
                        <Button variant={tab === 'routes' ? 'primary' : 'outline'} onClick={() => setTab('routes')}>
                            <MapPin className="mr-2 h-4 w-4" /> Routes
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <Truck className="h-8 w-8 text-primary" />
                        <div><p className="text-2xl font-bold">{vehicles.length}</p><p className="text-xs text-muted-foreground">Vehicles</p></div>
                    </CardBody></Card>
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <MapPin className="h-8 w-8 text-green-500" />
                        <div><p className="text-2xl font-bold">{routes.length}</p><p className="text-xs text-muted-foreground">Routes</p></div>
                    </CardBody></Card>
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <Users className="h-8 w-8 text-blue-500" />
                        <div><p className="text-2xl font-bold">{routes.reduce((sum, r) => sum + (r._count?.transportAssignments ?? 0), 0)}</p><p className="text-xs text-muted-foreground">Students Assigned</p></div>
                    </CardBody></Card>
                </div>

                {tab === 'vehicles' && (
                    <div className="rounded-md border border-border">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border bg-muted/50">
                                <th className="p-3 text-left font-medium">Registration No.</th>
                                <th className="p-3 text-left font-medium">Type</th>
                                <th className="p-3 text-left font-medium">Capacity</th>
                                <th className="p-3 text-left font-medium">Driver</th>
                                <th className="p-3 text-left font-medium">Routes</th>
                            </tr></thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                ) : vehicles.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No vehicles found.</td></tr>
                                ) : vehicles.map(v => (
                                    <tr key={v.id} className="border-b border-border last:border-0">
                                        <td className="p-3 font-medium">{v.registrationNo}</td>
                                        <td className="p-3"><Badge variant="secondary">{v.type || 'Bus'}</Badge></td>
                                        <td className="p-3">{v.capacity || '—'}</td>
                                        <td className="p-3">{v.driver || '—'}</td>
                                        <td className="p-3">{v.transportRoutes?.length ?? 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'routes' && (
                    <div className="rounded-md border border-border">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border bg-muted/50">
                                <th className="p-3 text-left font-medium">Route Name</th>
                                <th className="p-3 text-left font-medium">Vehicle</th>
                                <th className="p-3 text-left font-medium">Pickup</th>
                                <th className="p-3 text-left font-medium">Drop</th>
                                <th className="p-3 text-left font-medium">Students</th>
                            </tr></thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
                                ) : routes.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No routes found.</td></tr>
                                ) : routes.map(r => (
                                    <tr key={r.id} className="border-b border-border last:border-0">
                                        <td className="p-3 font-medium">{r.name}</td>
                                        <td className="p-3">{r.vehicle?.registrationNo || '—'}</td>
                                        <td className="p-3">{r.pickupTime || '—'}</td>
                                        <td className="p-3">{r.dropTime || '—'}</td>
                                        <td className="p-3"><Badge variant="default">{r._count?.transportAssignments ?? 0}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    )
}
