// UI primitives
export {
  Button,
  buttonVariants,
  RawInput,
  Input,
  Label,
  Badge,
  badgeVariants,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardBody,
  CardFooter,
  Spinner,
  Separator,
  ErrorBoundary,
  ErrorFallback,
} from './ui'

// Overlay / feedback
export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Toaster,
  MultiSelectDropdown,
} from './ui'

// Data
export { DataTable, SortableHeader } from './ui'
export type { DataTableProps } from './ui'

// Auth / role-based rendering
export {
  PermissionGate,
  RoleGate,
  PlatformOnly,
  ProtectedRoute,
} from './auth'
