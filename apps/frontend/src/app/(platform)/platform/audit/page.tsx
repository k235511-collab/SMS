'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import { api } from '@/lib/api-client'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string
  details?: string
  ipAddress?: string
  createdAt: string
  user?: { firstName: string; lastName: string; email: string }
  school?: { name: string; slug: string }
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
  LOGIN: 'default',
  LOGOUT: 'secondary',
}

export default function PlatformAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params: Record<string, string | number> = { page, pageSize }
    if (search) params.search = search
    if (actionFilter) params.action = actionFilter
    const res = await api.get<any>('/platform/audit-logs', { params })
    if (res.success && res.data) {
      const d = res.data
      if (d.data) {
        setLogs(d.data)
        setTotal(d.total || d.data.length)
      } else if (Array.isArray(d)) {
        setLogs(d)
        setTotal(d.length)
      }
    }
    setLoading(false)
  }, [page, search, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / pageSize)

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <Badge variant={(ACTION_COLORS[row.original.action] as any) || 'secondary'}>
          {row.original.action}
        </Badge>
      ),
    },
    {
      accessorKey: 'entityType',
      header: 'Entity',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.entityType}</p>
          {row.original.entityId && (
            <p className="text-xs text-muted-foreground font-mono">{row.original.entityId.substring(0, 8)}...</p>
          )}
        </div>
      ),
    },
    {
      id: 'user',
      header: 'User',
      cell: ({ row }) => row.original.user ? (
        <div>
          <p className="text-sm text-foreground">{row.original.user.firstName} {row.original.user.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.original.user.email}</p>
        </div>
      ) : <span className="text-muted-foreground text-xs">System</span>,
    },
    {
      id: 'school',
      header: 'School',
      cell: ({ row }) => row.original.school ? (
        <Badge variant="secondary">{row.original.school.name}</Badge>
      ) : <span className="text-muted-foreground text-xs">Platform</span>,
    },
    {
      accessorKey: 'details',
      header: 'Details',
      cell: ({ row }) => (
        <p className="max-w-[200px] truncate text-xs text-muted-foreground" title={row.original.details || ''}>
          {row.original.details || '—'}
        </p>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP',
      cell: ({ row }) => (
        <span className="text-xs font-mono text-muted-foreground">
          {row.original.ipAddress || '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description={`Cross-school audit trail (${total} total entries)`}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, entity, details..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === 'all' ? '' : v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="LOGOUT">Logout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoader message="Loading audit logs..." />
          ) : (
            <DataTable columns={columns} data={logs} />
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
