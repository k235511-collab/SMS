// ── Primitives ────────────────────────────────────────────────────────────────
export { Button, buttonVariants } from './button'
export type { ButtonProps } from './button'
export { RawInput, Input } from './input'
export type { InputProps, RawInputProps } from './input'
export { Label } from './label'
export { Badge, badgeVariants } from './badge'
export type { BadgeProps } from './badge'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardBody,
  CardFooter,
} from './card'
export { Spinner } from './spinner'
export { Separator } from './separator'

// ── Overlay / Feedback ────────────────────────────────────────────────────────
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog'

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './select'

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs'
export { Toaster } from './sonner'
export { MultiSelectDropdown } from './multi-select-dropdown'
export type { MultiSelectDropdownOption } from './multi-select-dropdown'

// ── Data ──────────────────────────────────────────────────────────────────────
export { DataTable, SortableHeader } from './data-table'
export type {
  DataTableProps,
  ColumnDef,
  SortingState,
  PaginationState,
  ColumnFiltersState,
  RowSelectionState,
} from './data-table'

// ── Error handling ────────────────────────────────────────────────────────────
export { ErrorBoundary } from './error-boundary'
export { ErrorFallback } from './error-fallback'

// ── Reusable patterns ─────────────────────────────────────────────────────────
export { StatusBadge } from './status-badge'
export type { StatusBadgeProps } from './status-badge'
export { UserAvatar } from './user-avatar'
export type { UserAvatarProps } from './user-avatar'
export { PageHeader } from './page-header'
export type { PageHeaderProps } from './page-header'
export { ConfirmDialog } from './confirm-dialog'
export type { ConfirmDialogProps } from './confirm-dialog'
export { EmptyState } from './empty-state'
export type { EmptyStateProps } from './empty-state'
export { StatCard } from './stat-card'
export type { StatCardProps } from './stat-card'
export { PageLoader } from './page-loader'
