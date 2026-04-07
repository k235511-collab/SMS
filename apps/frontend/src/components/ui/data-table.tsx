'use client'

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type PaginationState,
  type OnChangeFn,
  type RowSelectionState,
  type TableOptions,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState, type ReactNode } from 'react'
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Skeleton } from './skeleton'

function isInteractiveRowClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  const el = target.closest(
    'button,a,input,select,textarea,label,[role="button"],[role="menuitem"],[role="checkbox"],[role="switch"],[data-row-click="ignore"]',
  )
  if (!el) return false
  return true
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DataTableProps<TData, TValue> {
  /** Column definitions following @tanstack/react-table ColumnDef<T> */
  columns: ColumnDef<TData, TValue>[]
  /** Row data array */
  data: TData[]

  // ── Server-side support ────────────────────────────────────────────────

  /** Total row count (required for server-side pagination) */
  rowCount?: number
  /** When true, disables client-side sorting/filtering/pagination */
  manualPagination?: boolean
  manualSorting?: boolean
  manualFiltering?: boolean

  /** Controlled pagination state for server-side */
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>

  /** Controlled sorting for server-side */
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>

  /** Controlled column filters for server-side */
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>

  // ── Row selection ──────────────────────────────────────────────────────

  enableRowSelection?: boolean
  rowSelection?: RowSelectionState
  onRowSelectionChange?: OnChangeFn<RowSelectionState>

  // ── UI ─────────────────────────────────────────────────────────────────

  /** Show pagination controls (default true) */
  showPagination?: boolean
  /** Rows per page options */
  pageSizeOptions?: number[]
  /** Slot above table (search, filters, actions) */
  toolbar?: ReactNode
  /** Message shown when there are no rows */
  emptyMessage?: string
  /** Additional className on the wrapper */
  className?: string
  /** Loading skeleton overlay */
  isLoading?: boolean
  /** Optional row click callback */
  onRowClick?: (row: TData) => void
}

// ─── DataTable ──────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  rowCount,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pagination: controlledPagination,
  onPaginationChange,
  sorting: controlledSorting,
  onSortingChange,
  columnFilters: controlledFilters,
  onColumnFiltersChange,
  enableRowSelection = false,
  rowSelection: controlledRowSelection,
  onRowSelectionChange,
  showPagination = true,
  pageSizeOptions = [10, 20, 30, 50, 100],
  toolbar,
  emptyMessage = 'No results.',
  className,
  isLoading = false,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  // Local state used when not controlled externally
  const [internalSorting, setInternalSorting] = useState<SortingState>([])
  const [internalFilters, setInternalFilters] = useState<ColumnFiltersState>([])
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({})

  const sorting = controlledSorting ?? internalSorting
  const columnFilters = controlledFilters ?? internalFilters
  const pagination = controlledPagination ?? internalPagination
  const rowSelection = controlledRowSelection ?? internalRowSelection

  const tableOptions: TableOptions<TData> = {
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
      ...(enableRowSelection ? { rowSelection } : {}),
    },
    // Sorting
    onSortingChange: onSortingChange ?? setInternalSorting,
    ...(manualSorting ? { manualSorting: true } : { getSortedRowModel: getSortedRowModel() }),
    // Filtering
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalFilters,
    ...(manualFiltering
      ? { manualFiltering: true }
      : { getFilteredRowModel: getFilteredRowModel() }),
    // Pagination
    onPaginationChange: onPaginationChange ?? setInternalPagination,
    ...(manualPagination
      ? { manualPagination: true, rowCount }
      : { getPaginationRowModel: getPaginationRowModel() }),
    // Row selection
    enableRowSelection,
    onRowSelectionChange: onRowSelectionChange ?? setInternalRowSelection,
    // Visibility
    onColumnVisibilityChange: setColumnVisibility,
    // Core
    getCoreRowModel: getCoreRowModel(),
  }

  const table = useReactTable(tableOptions)

  return (
    <div className={cn('space-y-4', className)}>
      {toolbar}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="relative rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-border transition-colors hover:bg-muted/50"
                >
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody className="[&_tr:last-child]:border-0">
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {columns.map((_, j) => (
                      <td key={j} className="p-4 align-middle">
                        <Skeleton className="h-4 w-full opacity-60" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                      onRowClick && 'cursor-pointer',
                    )}
                    onClick={(e) => {
                      if (!onRowClick) return
                      if (isInteractiveRowClickTarget(e.target)) return
                      onRowClick(row.original)
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {showPagination && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between px-2">
          {/* Row selection info */}
          <div className="flex-1 text-sm text-muted-foreground">
            {enableRowSelection && (
              <>
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </>
            )}
          </div>

          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            {/* Rows per page */}
            <div className="flex items-center gap-2">
              <p className="hidden sm:block text-sm font-medium">Rows per page</p>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => {
                  const handler = onPaginationChange ?? setInternalPagination
                  handler((old) => ({
                    ...old,
                    pageSize: Number(value),
                    pageIndex: 0,
                  }))
                }}
              >
                <SelectTrigger className="h-8 w-auto min-w-16">
                  <SelectValue placeholder={pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {pageSizeOptions.map((size) => (
                    <SelectItem key={size} value={`${size}`}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Page indicator */}
            <div className="flex w-auto min-w-20 items-center justify-center text-sm font-medium whitespace-nowrap">
              Page {pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </div>

            {/* Prev / Next */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper: sortable header ─────────────────────────────────────────────────

export function SortableHeader({
  column,
  children,
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' }
  children: ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

// Re-export useful tanstack types for consumers
export type { ColumnDef, SortingState, PaginationState, ColumnFiltersState, RowSelectionState }
