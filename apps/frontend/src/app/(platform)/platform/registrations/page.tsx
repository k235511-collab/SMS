'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { DataTable, SortableHeader, type ColumnDef } from '@/components/ui/data-table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api-client'

interface Plan {
  id: string; name: string; slug: string; price: number; maxStudents?: number | null
}

import {
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Search,
  School as SchoolIcon,
  User,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'

export default function PlatformRegistrationsPage() {
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [approveTarget, setApproveTarget] = useState<any | null>(null)
  const [rejectTarget, setRejectTarget] = useState<any | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  const fetchPlans = useCallback(async () => {
    const res = await api.get<Plan[]>('/platform/plans')
    if (res.success && res.data) {
      setPlans(Array.isArray(res.data) ? res.data : [])
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const fetchRegistrations = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { pageSize: 100, search, status: 'PENDING' }
      const res = await api.get<any>('/platform/registrations', { params })
      if (res.success && res.data) {
        const d = res.data.data || res.data
        setRegistrations(Array.isArray(d) ? d : [])
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchRegistrations()
  }, [fetchRegistrations])

  const handleApprove = async () => {
    if (!approveTarget) return
    if (!selectedPlanId) {
      toast.error('Please select a subscription plan')
      return
    }
    setActionLoading(true)
    try {
      const res = await api.patch(`/platform/registrations/${approveTarget.id}/approve`, {
        subscriptionPlanId: selectedPlanId,
      })
      if (res.success) {
        toast.success(`Registration for ${approveTarget.schoolName} approved`)
        fetchRegistrations()
      } else {
        toast.error(res.message || 'Failed to approve registration')
      }
    } finally {
      setActionLoading(false)
      setApproveTarget(null)
      setSelectedPlanId('')
    }
  }

  const handleReject = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      const res = await api.patch(`/platform/registrations/${rejectTarget.id}/reject`, { reason: rejectReason })
      if (res.success) {
        toast.success(`Registration for ${rejectTarget.schoolName} rejected`)
        fetchRegistrations()
      } else {
        toast.error(res.message || 'Failed to reject registration')
      }
    } finally {
      setActionLoading(false)
      setRejectTarget(null)
      setRejectReason('')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'schoolName',
      header: ({ column }) => <SortableHeader column={column}>School Name</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            <SchoolIcon className="h-4 w-4 text-muted-foreground" />
            {row.original.schoolName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Contact: {row.original.email || 'N/A'}</p>
        </div>
      ),
    },
    {
      accessorKey: 'admin',
      header: 'Admin User',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            {row.original.adminFirstName} {row.original.adminLastName}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{row.original.adminEmail}</p>
          {row.original.adminGoogleId && (
            <Badge variant="secondary" className="mt-1 text-[10px]">Google Auth</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.status}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Submitted</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {new Date(row.original.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setApproveTarget(row.original)} className="text-success">
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRejectTarget(row.original)} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Registrations"
        description="Review and approve new school registration requests"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={registrations}
            isLoading={loading}
            emptyMessage="No pending registrations found."
          />
        </CardBody>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the registration for <strong>{approveTarget?.schoolName}</strong>?
              This will create a new school record and an admin user account.
            </AlertDialogDescription>
            <div className="py-4 space-y-2">
              <label className="text-sm font-medium">Select Subscription Plan <span className="text-destructive">*</span></label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (PKR {p.price}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-success text-white hover:bg-success/90"
              onClick={handleApprove}
              disabled={actionLoading}
            >
              {actionLoading ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Registration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject the registration for <strong>{rejectTarget?.schoolName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? 'Rejecting...' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
