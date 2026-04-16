'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef, SortableHeader } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardBody } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api-client'
import { Plus, Search, MoreHorizontal, Pencil, DollarSign, FileText, TrendingUp, Zap, AlertTriangle, Users, Trash2, Receipt, Tag, CreditCard, Percent, Clock, History, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CampusBadge } from '@/components/campus-badge'
import { cn } from '@/lib/utils'
import { useSession } from '@/context/session-context'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { PayFeeDialog, type PayableInvoice, GenerateInvoiceDialog } from '@/components/finance'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'

/* ─── Types ──────────────────────────────────────────────────── */
interface FeeStructure { id: string; name: string; amount: number; frequency: string; description?: string; isActive: boolean; classId?: string | null; class?: { id: string; name: string } | null }
interface Invoice { id: string; invoiceNo: string; studentId: string; student?: { firstName: string; lastName: string; rollNumber?: string; class?: { name: string }; section?: { name: string } }; feeStructure?: { id: string; name: string }; notes?: string | null; grossAmount?: number | null; discountType?: string | null; discountValue?: number | null; discountAmount?: number | null; totalAmount: number; paidAmount: number; dueDate: string; status: string; createdAt: string; academicYear?: { name: string } | null }
interface Payment { id: string; invoiceId: string; invoice?: { invoiceNo: string }; student?: { id: string; rollNumber: string; firstName: string; lastName: string; class?: { name: string }; section?: { name: string } }; amount: number; method: string; referenceNo?: string; paidAt: string; deletedAt?: string | null }
interface FinanceSummary { totalRevenue: number; totalInvoiced: number; pendingAmount: number; overdueAmount: number; unpaidInvoices: number; overdueInvoices: number; totalDiscount?: number; discountInvoices?: number; lastMonthPending?: number; lastYearPending?: number }
interface MonthlyData { month: string; receivable: number; collected: number; pending: number; expenses: number }
interface DailyData { day: string; collected: number; expenses: number }
interface YearlyData { year: string; receivable: number; collected: number; pending: number; expenses: number }
interface ExpenseCategory { id: string; name: string; isCustom: boolean; _count?: { expenses: number } }
interface Expense { id: string; title: string; description?: string; amount: number; date: string; receiptNo?: string; vendor?: string; categoryId: string; category?: { id: string; name: string }; createdAt: string }
interface ExpenseSummary { totalExpenses: number; expenseCount: number }
interface Defaulter { id: string; firstName: string; lastName: string; rollNumber: string; class?: { name: string }; section?: { name: string }; totalDue: number; totalPaid: number; outstanding: number }
interface TopDiscount { id: string; firstName: string; lastName: string; rollNumber: string; class?: { name: string }; section?: { name: string }; totalDiscount: number; invoiceCount: number }
interface PaginatedRes<T> { data: T[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

const frequencies = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']
const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { PAID: 'default', UNPAID: 'secondary', PARTIAL: 'outline', OVERDUE: 'destructive', CANCELLED: 'secondary', REFUNDED: 'outline' }

function getInvoiceFeeTypeLabel(invoice: Pick<Invoice, 'feeStructure' | 'notes' | 'invoiceNo'>): string {
  if (invoice.feeStructure?.name) return invoice.feeStructure.name
  const notes = invoice.notes?.trim()
  if (notes) {
    const fromFeePattern = notes.match(/fee:\s*([^—-]+?)(?:\s+[—-]\s+|$)/i)
    if (fromFeePattern?.[1]?.trim()) return fromFeePattern[1].trim()
    const fromBatchPattern = notes.match(/batch generated:\s*([^—-]+?)(?:\s+[—-]\s+|$)/i)
    if (fromBatchPattern?.[1]?.trim()) return fromBatchPattern[1].trim()
  }
  return 'General Fee Voucher'
}

/* ─── Custom Tooltip ─────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: Rs. {Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function FinancePage() {
  const { selectedYear, selectedCampus } = useSession()
  const [tab, setTab] = useState('overview')
  const [summary, setSummary] = useState<FinanceSummary | null>(null)

  // Chart data
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([])
  const [chartView, setChartView] = useState<'monthly' | 'daily' | 'yearly'>('monthly')
  const [chartLoading, setChartLoading] = useState(false)
  const [defaulters, setDefaulters] = useState<Defaulter[]>([])
  const [defaultersLoading, setDefaultersLoading] = useState(false)
  const [topDiscounts, setTopDiscounts] = useState<TopDiscount[]>([])
  const [topDiscountsLoading, setTopDiscountsLoading] = useState(false)

  // Fee structures state
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [feesTotal, setFeesTotal] = useState(0)
  const [feesLoading, setFeesLoading] = useState(false)
  const [feeDialogOpen, setFeeDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [feeForm, setFeeForm] = useState({ name: '', amount: '', frequency: 'MONTHLY', description: '', classId: '' })

  // Pending fees state
  const [pendingFees, setPendingFees] = useState<Invoice[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingPage, setPendingPage] = useState(1)
  const [pendingStatusFilter, setPendingStatusFilter] = useState<string>('')
  const [pendingClassId, setPendingClassId] = useState<string>('all')
  const [pendingSectionId, setPendingSectionId] = useState<string>('all')
  const [pendingSections, setPendingSections] = useState<{ id: string; name: string }[]>([])

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([])
  const [payTotal, setPayTotal] = useState(0)
  const [payLoading, setPayLoading] = useState(false)
  const [payPage, setPayPage] = useState(1)
  const [paySearch, setPaySearch] = useState('')
  const [payMethodFilter, setPayMethodFilter] = useState('')

  // Row selection state
  const [pendingRowSelection, setPendingRowSelection] = useState<Record<string, boolean>>({})
  const [paymentRowSelection, setPaymentRowSelection] = useState<Record<string, boolean>>({})

  // AlertDialog confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmDesc, setConfirmDesc] = useState('')

  const [saving, setSaving] = useState(false)

  // Batch generate state
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [checkingOverdue, setCheckingOverdue] = useState(false)

  // Expenses state
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesTotal, setExpensesTotal] = useState(0)
  const [expensesLoading, setExpensesLoading] = useState(false)
  const [expensePage, setExpensePage] = useState(1)
  const [expenseSearch, setExpenseSearch] = useState('')
  const [expenseCatFilter, setExpenseCatFilter] = useState('')
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseForm, setExpenseForm] = useState({ title: '', description: '', amount: '', date: '', receiptNo: '', vendor: '', categoryId: '' })
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary | null>(null)

  // Pay fee state
  const [payFeeDialogOpen, setPayFeeDialogOpen] = useState(false)
  const [payPreSelectedInvoiceId, setPayPreSelectedInvoiceId] = useState<string | null>(null)
  const [payingStudentId, setPayingStudentId] = useState<string | null>(null)

  /* ─── Fetchers ─────────────────────────────────────────────── */

  const fetchSummary = useCallback(async () => {
    if (!selectedYear) return
    const params: Record<string, string> = { startDate: selectedYear.startDate, endDate: selectedYear.endDate, academicYearId: selectedYear.id }
    const res = await api.get<FinanceSummary>('/finance/summary', { params })
    if (res.success && res.data) setSummary(res.data)
    else console.warn('[Finance] fetchSummary failed:', res.message, res.statusCode)
  }, [selectedYear, selectedCampus])

  const fetchMonthlyCollection = useCallback(async () => {
    if (!selectedYear) return
    setChartLoading(true)
    const params = {
      startDate: selectedYear.startDate,
      endDate: selectedYear.endDate,
      academicYearId: selectedYear.id,
    }
    const res = await api.get<MonthlyData[]>('/finance/monthly-collection', { params })
    if (res.success && res.data) setMonthlyData(Array.isArray(res.data) ? res.data : [])
    setChartLoading(false)
  }, [selectedYear, selectedCampus])

  const fetchDailyCollection = useCallback(async () => {
    if (!selectedYear) return
    setChartLoading(true)
    // Show last 30 days
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const params = { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) }
    const res = await api.get<DailyData[]>('/finance/daily-collection', { params })
    if (res.success && res.data) setDailyData(Array.isArray(res.data) ? res.data : [])
    setChartLoading(false)
  }, [selectedYear, selectedCampus])

  const fetchYearlyCollection = useCallback(async () => {
    setChartLoading(true)
    const res = await api.get<YearlyData[]>('/finance/yearly-collection')
    if (res.success && res.data) setYearlyData(Array.isArray(res.data) ? res.data : [])
    setChartLoading(false)
  }, [selectedCampus])

  const fetchDefaulters = useCallback(async () => {
    if (!selectedYear) return
    setDefaultersLoading(true)
    const params = { startDate: selectedYear.startDate, endDate: selectedYear.endDate, limit: '10' }
    const res = await api.get<Defaulter[]>('/finance/top-defaulters', { params })
    if (res.success && res.data) setDefaulters(Array.isArray(res.data) ? res.data : [])
    setDefaultersLoading(false)
  }, [selectedYear, selectedCampus])

  const fetchTopDiscounts = useCallback(async () => {
    if (!selectedYear) return
    setTopDiscountsLoading(true)
    const params = { startDate: selectedYear.startDate, endDate: selectedYear.endDate, limit: '10' }
    const res = await api.get<TopDiscount[]>('/finance/top-discounts', { params })
    if (res.success && res.data) setTopDiscounts(Array.isArray(res.data) ? res.data : [])
    setTopDiscountsLoading(false)
  }, [selectedYear, selectedCampus])

  const fetchFees = useCallback(async () => {
    setFeesLoading(true)
    const params: any = { page: 1, pageSize: 100 }
    if (selectedYear) { params.startDate = selectedYear.startDate; params.endDate = selectedYear.endDate }
    const res = await api.get<PaginatedRes<FeeStructure>>('/finance/fee-structures', { params })
    if (res.success && res.data) { setFees(res.data.data || []); setFeesTotal(res.data.meta?.total || 0) }
    setFeesLoading(false)
  }, [selectedYear, selectedCampus])

  const fetchPendingFees = useCallback(async () => {
    if (!selectedYear) return
    setPendingLoading(true)
    const params: any = {
      page: pendingPage,
      pageSize: 20,
      search: pendingSearch || undefined,
      academicYearId: selectedYear.id,
      ...(pendingStatusFilter ? { status: pendingStatusFilter } : {}),
      ...(pendingClassId && pendingClassId !== 'all' ? { classId: pendingClassId } : {}),
      ...(pendingSectionId && pendingSectionId !== 'all' ? { sectionId: pendingSectionId } : {}),
    }
    const res = await api.get<PaginatedRes<Invoice>>('/finance/pending-fees', { params })
    if (res.success && res.data) { setPendingFees(res.data.data || []); setPendingTotal(res.data.meta?.total || 0) }
    setPendingLoading(false)
  }, [pendingPage, pendingSearch, pendingStatusFilter, pendingClassId, pendingSectionId, selectedYear, selectedCampus])

  const fetchPayments = useCallback(async () => {
    if (!selectedYear) return
    setPayLoading(true)
    const params: any = {
      page: payPage,
      pageSize: 20,
      academicYearId: selectedYear.id,
      startDate: selectedYear.startDate,
      endDate: selectedYear.endDate,
      search: paySearch || undefined,
      ...(payMethodFilter ? { method: payMethodFilter } : {}),
    }
    const res = await api.get<PaginatedRes<Payment>>('/finance/payments', { params })
    if (res.success && res.data) { setPayments(res.data.data || []); setPayTotal(res.data.meta?.total || 0) }
    setPayLoading(false)
  }, [payPage, paySearch, payMethodFilter, selectedYear, selectedCampus])

  const fetchExpenseCategories = useCallback(async () => {
    const res = await api.get<ExpenseCategory[]>('/finance/expense-categories')
    if (res.success && res.data) setExpenseCategories(Array.isArray(res.data) ? res.data : [])
  }, [])

  const fetchExpenses = useCallback(async () => {
    if (!selectedYear) return
    setExpensesLoading(true)
    const params: any = {
      page: expensePage, pageSize: 20,
      startDate: selectedYear.startDate, endDate: selectedYear.endDate,
      search: expenseSearch || undefined,
      categoryId: expenseCatFilter && expenseCatFilter !== 'all' ? expenseCatFilter : undefined,
    }
    const res = await api.get<PaginatedRes<Expense>>('/finance/expenses', { params })
    if (res.success && res.data) { setExpenses(res.data.data || []); setExpensesTotal(res.data.meta?.total || 0) }
    setExpensesLoading(false)
  }, [expensePage, expenseSearch, expenseCatFilter, selectedYear, selectedCampus])

  const fetchExpenseSummary = useCallback(async () => {
    if (!selectedYear) return
    const params = { startDate: selectedYear.startDate, endDate: selectedYear.endDate }
    const res = await api.get<ExpenseSummary>('/finance/expense-summary', { params })
    if (res.success && res.data) setExpenseSummary(res.data)
  }, [selectedYear, selectedCampus])

  /* ─── Effects ──────────────────────────────────────────────── */
  useEffect(() => { fetchSummary(); fetchMonthlyCollection(); fetchDefaulters(); fetchExpenseSummary(); fetchTopDiscounts() }, [fetchSummary, fetchMonthlyCollection, fetchDefaulters, fetchExpenseSummary, fetchTopDiscounts])
  useEffect(() => { if (chartView === 'daily') fetchDailyCollection(); if (chartView === 'yearly') fetchYearlyCollection() }, [chartView, fetchDailyCollection, fetchYearlyCollection])
  useEffect(() => { if (tab === 'fees') fetchFees() }, [tab, fetchFees])
  useEffect(() => { if (tab === 'pending') fetchPendingFees() }, [tab, fetchPendingFees])
  useEffect(() => { if (tab === 'payments') fetchPayments() }, [tab, fetchPayments])
  useEffect(() => { if (tab === 'expenses') { fetchExpenses(); fetchExpenseCategories() } }, [tab, fetchExpenses, fetchExpenseCategories])

  // Reset pagination state when campus changes
  useCampusRefetch(() => {
    setPendingPage(1)
    setPayPage(1)
    setExpensePage(1)
    setPendingRowSelection({})
    setPaymentRowSelection({})
  }, [])

  // Fetch classes for batch generate dialog
  useEffect(() => {
    const fetchClasses = async () => {
      const res = await api.get<any>('/academics/classes?pageSize=100')
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
        setClasses(list.map((c: any) => ({ id: c.id, name: c.name })))
      }
    }
    fetchClasses()
  }, [])

  // Fetch sections when pending class filter changes
  useEffect(() => {
    const fetchSections = async () => {
      if (!pendingClassId || pendingClassId === 'all') {
        setPendingSections([])
        setPendingSectionId('all')
        return
      }
      const res = await api.get<any>(`/academics/sections/class/${pendingClassId}`)
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
        setPendingSections(list.map((s: any) => ({ id: s.id, name: s.name })))
      }
    }
    fetchSections()
  }, [pendingClassId])

  /* ─── Handlers ─────────────────────────────────────────────── */

  const openCreateFee = () => { setEditingFee(null); setFeeForm({ name: '', amount: '', frequency: 'MONTHLY', description: '', classId: '' }); setFeeDialogOpen(true) }
  const openEditFee = (f: FeeStructure) => { setEditingFee(f); setFeeForm({ name: f.name, amount: f.amount.toString(), frequency: f.frequency, description: f.description || '', classId: f.classId || '' }); setFeeDialogOpen(true) }

  const handleSaveFee = async () => {
    setSaving(true)
    try {
      const body: any = { name: feeForm.name, amount: Number(feeForm.amount), frequency: feeForm.frequency, description: feeForm.description || undefined }
      if (feeForm.classId) body.classId = feeForm.classId
      else body.classId = null
      const res = editingFee ? await api.patch(`/finance/fee-structures/${editingFee.id}`, body) : await api.post('/finance/fee-structures', body)
      if (res.success) { toast.success(editingFee ? 'Fee updated' : 'Fee created'); setFeeDialogOpen(false); fetchFees() }
      else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleBatchGenerateSuccess = () => {
    fetchPendingFees()
    fetchSummary()
    fetchMonthlyCollection()
    fetchDefaulters()
  }

  const handleCheckOverdue = async () => {
    setCheckingOverdue(true)
    try {
      const res = await api.post<{ message: string }>('/finance/invoices/check-overdue', {})
      if (res.success) {
        toast.success('Overdue check completed — fee vouchers updated')
        setPendingStatusFilter('OVERDUE')
        setPendingPage(1)
        setTab('pending')
        fetchSummary()
        fetchDefaulters()
        fetchPendingFees()
      } else {
        toast.error(res.message || 'Check failed')
      }
    } finally { setCheckingOverdue(false) }
  }

  /* ─── Pay Fee Handlers ─────────────────────────────────────── */

  const openPayFee = (invoice: Invoice) => {
    setPayPreSelectedInvoiceId(invoice.id)
    setPayingStudentId(invoice.studentId)
    setPayFeeDialogOpen(true)
  }

  const handlePayFeeSuccess = () => {
    fetchPendingFees()
    fetchPayments()
    fetchSummary()
    fetchMonthlyCollection()
    fetchDefaulters()
  }

  const handleDeleteInvoice = async (invoiceId: string) => {
    showConfirm('Delete Fee Voucher', 'Delete this fee voucher permanently from database? This cannot be undone.', async () => {
      const res = await api.delete(`/finance/invoices/${invoiceId}`)
      if (res.success) {
        toast.success('Fee voucher deleted')
        setPendingRowSelection({})
        fetchPendingFees()
        fetchSummary()
        fetchMonthlyCollection()
        fetchDefaulters()
      } else {
        toast.error(res.message || 'Failed to delete fee voucher')
      }
    }, true)
  }

  const handleBulkDeleteInvoices = async () => {
    const selectedIds = Object.keys(pendingRowSelection).filter(k => pendingRowSelection[k]).map(idx => pendingFees[Number(idx)]?.id).filter(Boolean)
    if (selectedIds.length === 0) return
    showConfirm('Delete Fee Vouchers', `Permanently delete ${selectedIds.length} selected fee voucher(s)? This cannot be undone.`, async () => {
      const res = await api.post('/finance/invoices/bulk-delete', { ids: selectedIds })
      if (res.success) {
        toast.success(`Deleted ${(res.data as any)?.deleted || selectedIds.length} fee voucher(s)`)
        setPendingRowSelection({})
        fetchPendingFees()
        fetchSummary()
        fetchMonthlyCollection()
        fetchDefaulters()
      } else {
        toast.error(res.message || 'Failed to delete fee vouchers')
      }
    }, true)
  }

  const handleDeletePayment = async (paymentId: string) => {
    showConfirm('Move to Trash', 'Move this payment to trash? The fee voucher totals will be recalculated.', async () => {
      const res = await api.delete(`/finance/payments/${paymentId}`)
      if (res.success) {
        toast.success('Payment moved to trash')
        setPaymentRowSelection({})
        fetchPayments()
        fetchPendingFees()
        fetchSummary()
        fetchMonthlyCollection()
        fetchDefaulters()
      } else {
        toast.error(res.message || 'Failed to delete payment')
      }
    }, true)
  }

  const handleBulkDeletePayments = async () => {
    const selectedIds = Object.keys(paymentRowSelection).filter(k => paymentRowSelection[k]).map(idx => payments[Number(idx)]?.id).filter(Boolean)
    if (selectedIds.length === 0) return
    showConfirm('Move to Trash', `Move ${selectedIds.length} selected payment(s) to trash? Fee voucher totals will be recalculated.`, async () => {
      const res = await api.post('/finance/payments/bulk-delete', { ids: selectedIds })
      if (res.success) {
        toast.success(`Moved ${(res.data as any)?.deleted || selectedIds.length} payment(s) to trash`)
        setPaymentRowSelection({})
        fetchPayments()
        fetchPendingFees()
        fetchSummary()
        fetchMonthlyCollection()
        fetchDefaulters()
      } else {
        toast.error(res.message || 'Failed to delete payments')
      }
    }, true)
  }

  const showConfirm = (title: string, desc: string, action: () => Promise<void>, destructive = false) => {
    setConfirmTitle(title)
    setConfirmDesc(desc)
    setConfirmAction(() => action)
    setConfirmOpen(true)
  }

  /* ─── Expense Handlers ─────────────────────────────────────── */

  const openCreateExpense = () => {
    setEditingExpense(null)
    setExpenseForm({ title: '', description: '', amount: '', date: new Date().toISOString().split('T')[0], receiptNo: '', vendor: '', categoryId: '' })
    setExpenseDialogOpen(true)
  }

  const openEditExpense = (e: Expense) => {
    setEditingExpense(e)
    setExpenseForm({
      title: e.title, description: e.description || '', amount: e.amount.toString(),
      date: new Date(e.date).toISOString().split('T')[0], receiptNo: e.receiptNo || '',
      vendor: e.vendor || '', categoryId: e.categoryId,
    })
    setExpenseDialogOpen(true)
  }

  const handleSaveExpense = async () => {
    setSaving(true)
    try {
      const body: any = {
        title: expenseForm.title, amount: Number(expenseForm.amount),
        date: expenseForm.date, categoryId: expenseForm.categoryId,
        description: expenseForm.description || undefined,
        receiptNo: expenseForm.receiptNo || undefined,
        vendor: expenseForm.vendor || undefined,
      }
      const res = editingExpense
        ? await api.patch(`/finance/expenses/${editingExpense.id}`, body)
        : await api.post('/finance/expenses', body)
      if (res.success) {
        toast.success(editingExpense ? 'Expense updated' : 'Expense added')
        setExpenseDialogOpen(false); fetchExpenses(); fetchExpenseSummary(); fetchMonthlyCollection()
      } else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleDeleteExpense = async (id: string) => {
    const res = await api.delete(`/finance/expenses/${id}`)
    if (res.success) { toast.success('Expense deleted'); fetchExpenses(); fetchExpenseSummary(); fetchMonthlyCollection() }
    else toast.error(res.message || 'Failed')
  }

  const handleSeedCategories = async () => {
    const res = await api.post('/finance/expense-categories/seed-defaults', {})
    if (res.success) { toast.success('Default categories added'); fetchExpenseCategories() }
    else toast.error(res.message || 'Failed')
  }

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return
    const res = await api.post('/finance/expense-categories', { name: newCatName.trim() })
    if (res.success) { toast.success('Category created'); setNewCatName(''); setCatDialogOpen(false); fetchExpenseCategories() }
    else toast.error(res.message || 'Failed')
  }

  const handleDeleteCategory = async (id: string) => {
    const res = await api.delete(`/finance/expense-categories/${id}`)
    if (res.success) { toast.success('Category deleted'); fetchExpenseCategories() }
    else toast.error(res.message || 'Delete failed — category may have expenses')
  }

  /* ─── Column Definitions ───────────────────────────────────── */

  const feeCols: ColumnDef<FeeStructure, unknown>[] = [
    { accessorKey: 'name', header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader> },
    { id: 'class', header: 'Class', cell: ({ row }) => row.original.class ? <Badge variant="outline">{row.original.class.name}</Badge> : <span className="text-muted-foreground text-xs">All Classes</span> },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => `Rs. ${row.original.amount.toLocaleString()}` },
    { accessorKey: 'frequency', header: 'Frequency', cell: ({ row }) => <Badge variant="outline">{(row.original.frequency || '').replace(/_/g, ' ')}</Badge> },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="finance:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEditFee(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      )
    },
  ]

  const pendingCols: ColumnDef<Invoice, unknown>[] = [
    {
      id: 'select',
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} onClick={(e) => e.stopPropagation()} aria-label="Select row" />,
      enableSorting: false, enableHiding: false,
    },
    { accessorKey: 'invoiceNo', header: 'Voucher #' },
    {
      id: 'student', header: 'Student', cell: ({ row }) => {
        const s = row.original.student
        if (!s) return '—'
        return (
          <div>
            <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
            <p className="text-xs text-muted-foreground">
              {s.rollNumber}{s.class ? ` · ${s.class.name}` : ''}{s.section ? ` (${s.section.name})` : ''}
            </p>
          </div>
        )
      }
    },
    { id: 'fee', header: 'Fee Type', cell: ({ row }) => getInvoiceFeeTypeLabel(row.original) },
    {
      id: 'academicYear', header: 'Academic Year', cell: ({ row }) => {
        const inv = row.original
        if (inv.academicYear?.name) {
          return <Badge variant="outline">{inv.academicYear.name}</Badge>
        }
        return <span className="text-xs text-muted-foreground">—</span>
      }
    },
    { accessorKey: 'totalAmount', header: 'Amount', cell: ({ row }) => {
      const inv = row.original
      if (inv.discountAmount && inv.discountAmount > 0) {
        const label = inv.discountType === 'PERCENTAGE' ? `${inv.discountValue}%` : `Rs.${inv.discountValue?.toLocaleString()}`
        return (
          <div className="flex flex-col">
            <span>Rs. {inv.totalAmount.toLocaleString()}</span>
            <span className="text-xs text-green-600">-{label} off</span>
          </div>
        )
      }
      return `Rs. ${inv.totalAmount.toLocaleString()}`
    }},
    { accessorKey: 'paidAmount', header: 'Paid', cell: ({ row }) => `Rs. ${(row.original.paidAmount || 0).toLocaleString()}` },
    { id: 'outstanding', header: 'Outstanding', cell: ({ row }) => { const out = row.original.totalAmount - (row.original.paidAmount || 0); return <span className="font-semibold text-red-600">Rs. {out.toLocaleString()}</span> } },
    { accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => new Date(row.original.dueDate).toLocaleDateString() },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge variant={statusVariant[row.original.status] || 'secondary'}>{row.original.status}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => {
        const inv = row.original
        const outstanding = inv.totalAmount - (inv.paidAmount || 0)
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {outstanding > 0 && (
                <PermissionGate permission="finance:create">
                  <DropdownMenuItem onClick={() => openPayFee(inv)}>
                    <CreditCard className="mr-2 h-4 w-4" />Pay
                  </DropdownMenuItem>
                </PermissionGate>
              )}
              <PermissionGate permission="finance:update">
                <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteInvoice(inv.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />Delete Fee Voucher
                </DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    },
  ]

  const paymentCols: ColumnDef<Payment, unknown>[] = [
    {
      id: 'select',
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected()} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label="Select all" />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} onClick={(e) => e.stopPropagation()} aria-label="Select row" />,
      enableSorting: false, enableHiding: false,
    },
    { accessorKey: 'invoice', header: 'Voucher #', cell: ({ row }) => row.original.invoice?.invoiceNo || '—' },
    {
      id: 'student', header: 'Paid By',
      cell: ({ row }) => {
        const s = row.original.student
        if (!s) return '—'
        return (
          <div>
            <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
            <p className="text-xs text-muted-foreground">
              {s.rollNumber}{s.class ? ` · ${s.class.name}` : ''}{s.section ? ` (${s.section.name})` : ''}
            </p>
          </div>
        )
      }
    },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => `Rs. ${row.original.amount.toLocaleString()}` },
    { accessorKey: 'method', header: 'Method', cell: ({ row }) => <Badge variant="outline">{(row.original.method || '').replace(/_/g, ' ')}</Badge> },
    {
      accessorKey: 'paidAt',
      header: 'Paid Date & Time',
      cell: ({ row }) => new Date(row.original.paidAt).toLocaleString(),
    },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="finance:update">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(row.original.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </PermissionGate>
      )
    },
  ]

  const expenseCols: ColumnDef<Expense, unknown>[] = [
    { accessorKey: 'date', header: 'Date', cell: ({ row }) => new Date(row.original.date).toLocaleDateString() },
    { accessorKey: 'title', header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader> },
    { id: 'category', header: 'Category', cell: ({ row }) => row.original.category ? <Badge variant="outline">{row.original.category.name}</Badge> : '—' },
    { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <span className="font-semibold text-red-600">Rs. {row.original.amount.toLocaleString()}</span> },
    { accessorKey: 'vendor', header: 'Vendor', cell: ({ row }) => row.original.vendor || '—' },
    { accessorKey: 'receiptNo', header: 'Receipt #', cell: ({ row }) => row.original.receiptNo || '—' },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="finance:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditExpense(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteExpense(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      )
    },
  ]

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <ProtectedRoute permission="finance:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Finance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage fees, fee vouchers, and payments</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fees">Fee Structures</TabsTrigger>
            <TabsTrigger value="pending">Pending Fee</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-green-100 p-3 text-green-600 dark:bg-green-950 dark:text-green-400"><TrendingUp className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Collected</p>
                    <p className="text-lg font-bold truncate">Rs. {summary?.totalRevenue?.toLocaleString() || '0'}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-600 dark:bg-blue-950 dark:text-blue-400"><DollarSign className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Receivable</p>
                    <p className="text-lg font-bold truncate">Rs. {summary?.totalInvoiced?.toLocaleString() || '0'}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-yellow-100 p-3 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"><FileText className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Pending Amount</p>
                    <p className="text-lg font-bold truncate">Rs. {summary?.pendingAmount?.toLocaleString() || '0'}</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-red-100 p-3 text-red-600 dark:bg-red-950 dark:text-red-400"><AlertTriangle className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Overdue</p>
                    <p className="text-lg font-bold truncate">Rs. {summary?.overdueAmount?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-muted-foreground">{summary?.overdueInvoices || 0} overdue</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-purple-100 p-3 text-purple-600 dark:bg-purple-950 dark:text-purple-400"><Receipt className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Expenses</p>
                    <p className="text-lg font-bold truncate">Rs. {expenseSummary?.totalExpenses?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-muted-foreground">{expenseSummary?.expenseCount || 0} entries</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-teal-100 p-3 text-teal-600 dark:bg-teal-950 dark:text-teal-400"><Percent className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Total Discount</p>
                    <p className="text-lg font-bold truncate">Rs. {summary?.totalDiscount?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-muted-foreground">{summary?.discountInvoices || 0} vouchers</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-950 dark:text-orange-400"><Clock className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Last Month Pending</p>
                    <p className="text-lg font-bold truncate text-orange-600 dark:text-orange-400">Rs. {summary?.lastMonthPending?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-muted-foreground">previous month</p>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="flex items-center gap-4 p-4">
                  <div className="rounded-xl bg-rose-100 p-3 text-rose-600 dark:bg-rose-950 dark:text-rose-400"><History className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Last Year Pending</p>
                    <p className="text-lg font-bold truncate text-rose-600 dark:text-rose-400">Rs. {summary?.lastYearPending?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-muted-foreground">previous academic year</p>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Fee Collection Line Chart */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">Fee Collection Trend</h3>
                  <p className="text-xs text-muted-foreground">
                    {chartView === 'monthly'
                      ? `Monthly receivable vs collected for ${selectedYear?.name || 'current year'}`
                      : chartView === 'daily'
                        ? 'Daily collection & expenses (last 30 days)'
                        : 'Yearly overview across all academic years'}
                  </p>
                </div>
                <Select value={chartView} onValueChange={(v: 'monthly' | 'daily' | 'yearly') => setChartView(v)}>
                  <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {chartLoading ? (
                <Skeleton className="h-[320px] w-full rounded-lg" />
              ) : chartView === 'monthly' ? (
                monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="receivable" name="Receivable" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="collected" name="Collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                    No fee data for this academic year. Generate fee vouchers to see the chart.
                  </div>
                )
              ) : chartView === 'daily' ? (
                dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" interval={Math.max(0, Math.floor(dailyData.length / 10))} angle={-35} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="collected" name="Collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                    No data for the last 30 days.
                  </div>
                )
              ) : (
                yearlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={yearlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="receivable" name="Receivable" stroke="#3b82f6" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                      <Line type="monotone" dataKey="collected" name="Collected" stroke="#22c55e" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                      <Line type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#a855f7" strokeWidth={2} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[320px] text-muted-foreground text-sm">
                    No yearly data available.
                  </div>
                )
              )}
            </div>

            {/* Top Fee Defaulters */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4 text-red-500" />
                  Top Fee Defaulters
                </h3>
                <p className="text-xs text-muted-foreground">Students with highest outstanding balances in {selectedYear?.name || 'current year'}</p>
              </div>
              {defaultersLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : defaulters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {defaulters.map((d, idx) => (
                    <div key={d.id} className="group relative rounded-lg border bg-background p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' : idx < 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' : 'bg-muted text-muted-foreground'}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <p className="font-semibold text-sm truncate">{d.firstName} {d.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.rollNumber}{d.class ? ` · ${d.class.name}` : ''}{d.section ? ` (${d.section.name})` : ''}
                      </p>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">Rs. {d.outstanding.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">Due: Rs. {d.totalDue.toLocaleString()} | Paid: Rs. {d.totalPaid.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No defaulters found for this academic year.
                </div>
              )}
            </div>

            {/* Top Discounts */}
            <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Percent className="h-4 w-4 text-teal-500" />
                  Top Discounts
                </h3>
                <p className="text-xs text-muted-foreground">Students with highest total discounts in {selectedYear?.name || 'current year'}</p>
              </div>
              {topDiscountsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                </div>
              ) : topDiscounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {topDiscounts.map((d, idx) => (
                    <div key={d.id} className="group relative rounded-lg border bg-background p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400' : idx < 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                          #{idx + 1}
                        </span>
                      </div>
                      <p className="font-semibold text-sm truncate">{d.firstName} {d.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {d.rollNumber}{d.class ? ` · ${d.class.name}` : ''}{d.section ? ` (${d.section.name})` : ''}
                      </p>
                      <div className="mt-2 pt-2 border-t">
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">Rs. {d.totalDiscount.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{d.invoiceCount} voucher{d.invoiceCount !== 1 ? 's' : ''} with discount</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
                  No discounts found for this academic year.
                </div>
              )}
            </div>
          </TabsContent>

          {/* ═══ FEE STRUCTURES TAB ═══ */}
          <TabsContent value="fees" className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{feesTotal} fee structure(s)</p>
              <PermissionGate permission="finance:create"><Button onClick={openCreateFee}><Plus className="mr-2 h-4 w-4" />Add Fee Structure</Button></PermissionGate>
            </div>
            <DataTable columns={feeCols} data={fees} isLoading={feesLoading} emptyMessage="No fee structures found." />
          </TabsContent>

          {/* ═══ PENDING FEE TAB ═══ */}
          <TabsContent value="pending" className="mt-6">
            {Object.keys(pendingRowSelection).filter(k => pendingRowSelection[k]).length > 0 && (
              <div className="flex items-center gap-3 mb-3 p-2 bg-muted rounded-md">
                <span className="text-sm font-medium">{Object.keys(pendingRowSelection).filter(k => pendingRowSelection[k]).length} fee voucher(s) selected</span>
                <PermissionGate permission="finance:update">
                  <Button size="sm" variant="destructive" onClick={handleBulkDeleteInvoices}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete Selected
                  </Button>
                </PermissionGate>
                <Button size="sm" variant="ghost" onClick={() => setPendingRowSelection({})}>Clear</Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mb-4">
              <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search by name, roll number..." value={pendingSearch} onChange={(e) => { setPendingSearch(e.target.value); setPendingPage(1) }} className="pl-9" /></div>
              <Select value={pendingStatusFilter || 'all'} onValueChange={(v) => { setPendingStatusFilter(v === 'all' ? '' : v); setPendingPage(1) }}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={pendingClassId} onValueChange={(v) => { setPendingClassId(v); setPendingPage(1) }}>
                <SelectTrigger className="w-full sm:w-36 drop-shadow-sm border-primary/20 bg-primary/5"><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={pendingSectionId} onValueChange={(v) => { setPendingSectionId(v); setPendingPage(1) }} disabled={pendingClassId === 'all'}>
                <SelectTrigger className="w-full sm:w-36 drop-shadow-sm border-primary/20 bg-primary/5"><SelectValue placeholder="All Sections" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {pendingSections.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold border border-orange-200 shadow-sm animate-in fade-in zoom-in">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Pending: {pendingTotal}
              </div>

              <div className="ml-auto flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <PermissionGate permission="finance:update">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={handleCheckOverdue} disabled={checkingOverdue}>
                    <AlertTriangle className="mr-2 h-4 w-4" />{checkingOverdue ? 'Checking...' : 'Check Overdue'}
                  </Button>
                </PermissionGate>
                <PermissionGate permission="finance:create">
                  <Button size="sm" className="flex-1 sm:flex-none" onClick={() => { fetchFees(); setBatchDialogOpen(true) }}>
                    <Zap className="mr-2 h-4 w-4" />Generate Vouchers
                  </Button>
                </PermissionGate>
              </div>
            </div>

            <div className="hidden sm:block">
              <DataTable columns={pendingCols} data={pendingFees} isLoading={pendingLoading} emptyMessage={pendingStatusFilter === 'OVERDUE' ? 'No overdue fee vouchers found.' : 'No pending fees found — all fees are paid!'}
                enableRowSelection={true} rowSelection={pendingRowSelection} onRowSelectionChange={setPendingRowSelection} />
            </div>

            <div className="sm:hidden space-y-4 pb-24">
              {pendingLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
              ) : pendingFees.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground text-sm italic">
                  {pendingStatusFilter === 'OVERDUE' ? 'No overdue fee vouchers found.' : 'No pending fees found — all fees are paid!'}
                </div>
              ) : (
                pendingFees.map((inv: any) => (
                  <div key={inv.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    {/* Decorative background */}
                    <div className="absolute top-0 right-0 p-8 -mr-10 -mt-10 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                    
                    <div className="flex items-center justify-between relative">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={!!pendingRowSelection[inv.id]} 
                          onCheckedChange={(v) => setPendingRowSelection(prev => ({ ...prev, [inv.id]: !!v }))}
                          className="h-5 w-5 rounded-md"
                        />
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                          {inv.student?.firstName?.[0]}{inv.student?.lastName?.[0]}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">{inv.student?.firstName} {inv.student?.lastName}</h3>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{inv.student?.rollNumber}{inv.student?.class ? ` · ${inv.student.class.name}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "h-5 px-1.5 text-[10px] font-bold uppercase tracking-wide",
                            inv.status === 'PAID' ? "border-green-500/50 text-green-600 bg-green-500/5" : 
                            inv.status === 'OVERDUE' ? "border-destructive/50 text-destructive bg-destructive/5" : 
                            "border-amber-500/50 text-amber-600 bg-amber-500/5"
                          )}
                        >
                          {inv.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/5">
                              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {inv.totalAmount - (inv.paidAmount || 0) > 0 && (
                              <PermissionGate permission="finance:create">
                                <DropdownMenuItem onClick={() => openPayFee(inv)}>
                                  <CreditCard className="mr-2 h-4 w-4" /> Pay Voucher
                                </DropdownMenuItem>
                              </PermissionGate>
                            )}
                            <PermissionGate permission="finance:update">
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5" onClick={() => handleDeleteInvoice(inv.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Voucher
                              </DropdownMenuItem>
                            </PermissionGate>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/40 relative">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-medium uppercase tracking-wider">{getInvoiceFeeTypeLabel(inv)}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-foreground">Rs. {inv.totalAmount.toLocaleString()}</span>
                          {inv.discountAmount > 0 && (
                            <span className="text-[10px] text-green-600 font-bold">-{inv.discountType === 'PERCENTAGE' ? `${inv.discountValue}%` : `Rs.${inv.discountValue?.toLocaleString()}`} OFF</span>
                          )}
                        </div>
                      </div>
                      
                      {inv.paidAmount > 0 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/20">
                          <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><History className="h-3 w-3" /> Paid Amount</span>
                          <span className="font-semibold text-green-600">Rs. {inv.paidAmount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/20">
                        <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><AlertTriangle className="h-3 w-3" /> Outstanding</span>
                        <span className="font-bold text-red-600">Rs. {(inv.totalAmount - (inv.paidAmount || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1 relative">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Voucher No</span>
                        <span className="text-xs font-mono font-semibold">{inv.invoiceNo}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Due Date</span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(inv.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Pagination */}
            {pendingTotal > 20 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {pendingPage} of {Math.ceil(pendingTotal / 20)} ({pendingTotal} fee voucher(s))
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={pendingPage <= 1} onClick={() => setPendingPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={pendingPage >= Math.ceil(pendingTotal / 20)} onClick={() => setPendingPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ EXPENSES TAB ═══ */}
          <TabsContent value="expenses" className="mt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full mb-4">
              <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search expenses..." value={expenseSearch} onChange={(e) => { setExpenseSearch(e.target.value); setExpensePage(1) }} className="pl-9" /></div>
              <Select value={expenseCatFilter} onValueChange={(v) => { setExpenseCatFilter(v); setExpensePage(1) }}>
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setCatDialogOpen(true)}><Tag className="mr-2 h-4 w-4" />Categories</Button>
                <PermissionGate permission="finance:create"><Button size="sm" className="flex-1 sm:flex-none" onClick={openCreateExpense}><Plus className="mr-2 h-4 w-4" />Add Expense</Button></PermissionGate>
              </div>
            </div>

            <div className="hidden sm:block">
              <DataTable columns={expenseCols} data={expenses} isLoading={expensesLoading} emptyMessage="No expenses recorded yet." />
            </div>

            <div className="sm:hidden space-y-4 pb-24">
              {expensesLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
              ) : expenses.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground text-sm italic">No expenses recorded yet.</div>
              ) : (
                expenses.map(exp => (
                  <div key={exp.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 -mr-10 -mt-10 bg-destructive/5 rounded-full blur-3xl group-hover:bg-destructive/10 transition-colors" />
                    
                    <div className="flex items-start justify-between relative">
                       <div className="space-y-1.5">
                         <h3 className="font-bold text-foreground text-base leading-tight line-clamp-1">{exp.title}</h3>
                         {exp.category && (
                           <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wide border-primary/30 text-primary bg-primary/5">
                             {exp.category.name}
                           </Badge>
                         )}
                       </div>
                       <div className="flex items-center gap-1">
                         <PermissionGate permission="finance:update">
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/5">
                                 <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="w-48">
                               <DropdownMenuItem onClick={() => openEditExpense(exp)}>
                                 <Pencil className="mr-2 h-4 w-4" /> Edit Expense
                               </DropdownMenuItem>
                               <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5" onClick={() => handleDeleteExpense(exp.id)}>
                                 <Trash2 className="mr-2 h-4 w-4" /> Delete Expense
                               </DropdownMenuItem>
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </PermissionGate>
                       </div>
                    </div>
                    
                    <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/40 relative">
                      <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><DollarSign className="h-3.5 w-3.5 text-destructive" /> Amount</span>
                         <span className="font-bold text-red-600 text-base">Rs. {exp.amount.toLocaleString()}</span>
                      </div>
                      {exp.vendor && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/20">
                           <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><Users className="h-3 w-3" /> Vendor</span>
                           <span className="font-semibold text-foreground truncate max-w-[150px]">{exp.vendor}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-1 relative">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Receipt No</span>
                        <span className="text-xs font-mono font-semibold">{exp.receiptNo || '—'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Expense Date</span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(exp.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Pagination */}
            {expensesTotal > 20 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {expensePage} of {Math.ceil(expensesTotal / 20)} ({expensesTotal} expense(s))
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={expensePage <= 1} onClick={() => setExpensePage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={expensePage >= Math.ceil(expensesTotal / 20)} onClick={() => setExpensePage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══ PAYMENTS TAB ═══ */}
          <TabsContent value="payments" className="mt-6">
            {Object.keys(paymentRowSelection).filter(k => paymentRowSelection[k]).length > 0 && (
              <div className="flex items-center gap-3 mb-3 p-2 bg-muted rounded-md">
                <span className="text-sm font-medium">{Object.keys(paymentRowSelection).filter(k => paymentRowSelection[k]).length} payment(s) selected</span>
                <PermissionGate permission="finance:update">
                  <Button size="sm" variant="destructive" onClick={handleBulkDeletePayments}>
                    <Trash2 className="mr-2 h-4 w-4" />Move to Trash
                  </Button>
                </PermissionGate>
                <Button size="sm" variant="ghost" onClick={() => setPaymentRowSelection({})}>Clear</Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap mb-4">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student or voucher..."
                  className="pl-9 w-full sm:w-64"
                  value={paySearch}
                  onChange={(e) => { setPaySearch(e.target.value); setPayPage(1) }}
                />
              </div>
              <Select value={payMethodFilter || 'all'} onValueChange={(v) => { setPayMethodFilter(v === 'all' ? '' : v); setPayPage(1) }}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Methods" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {payTotal > 0 && (
                <span className="text-xs text-muted-foreground ml-auto hidden sm:block">{payTotal} payment(s)</span>
              )}
            </div>
            
            <div className="hidden sm:block">
              <DataTable
                columns={paymentCols}
                data={payments}
                isLoading={payLoading}
                emptyMessage="No payments found."
                enableRowSelection={true}
                rowSelection={paymentRowSelection}
                onRowSelectionChange={setPaymentRowSelection}
              />
            </div>

            <div className="sm:hidden space-y-4 pb-24">
              {payLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
              ) : payments.length === 0 ? (
                <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground text-sm italic">No payments found.</div>
              ) : (
                payments.map(pay => (
                  <div key={pay.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 -mr-10 -mt-10 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors" />
                    
                    <div className="flex items-center justify-between relative">
                       <div className="flex items-center gap-3">
                         <Checkbox 
                           checked={!!paymentRowSelection[pay.id]} 
                           onCheckedChange={(v) => setPaymentRowSelection(prev => ({ ...prev, [pay.id]: !!v }))}
                           className="h-5 w-5 rounded-md"
                         />
                         <div className="h-10 w-10 shrink-0 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center font-bold text-sm border border-green-500/20">
                           {pay.student?.firstName[0]}{pay.student?.lastName[0]}
                         </div>
                         <div className="space-y-0.5">
                           <h3 className="font-bold text-foreground text-sm leading-tight line-clamp-1">{pay.student?.firstName} {pay.student?.lastName}</h3>
                           <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">{pay.student?.rollNumber}{pay.student?.class ? ` · ${pay.student.class.name}` : ''}</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-1">
                         <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-tight border-green-500/30 text-green-600 bg-green-500/5">
                           {(pay.method || '').replace(/_/g, ' ')}
                         </Badge>
                         <PermissionGate permission="finance:update">
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-destructive/5 text-destructive" onClick={() => handleDeletePayment(pay.id)}>
                             <Trash2 className="h-4 w-4" />
                           </Button>
                         </PermissionGate>
                       </div>
                    </div>
                    
                    <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/40 relative">
                      <div className="flex items-center justify-between text-sm">
                         <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><DollarSign className="h-3.5 w-3.5 text-green-600" /> Received</span>
                         <span className="font-bold text-green-600 text-base">Rs. {pay.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/20">
                         <span className="text-muted-foreground flex items-center gap-1.5 font-medium"><Receipt className="h-3 w-3" /> Voucher No</span>
                         <span className="font-mono font-semibold text-foreground">{pay.invoice?.invoiceNo || '—'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1 relative">
                      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Payment ID: <span className="font-mono">{pay.id.substring(0, 8)}...</span></div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Paid At</span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(pay.paidAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Pagination */}
            {payTotal > 20 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Page {payPage} of {Math.ceil(payTotal / 20)}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={payPage <= 1} onClick={() => setPayPage((p) => p - 1)}>Previous</Button>
                  <Button size="sm" variant="outline" disabled={payPage >= Math.ceil(payTotal / 20)} onClick={() => setPayPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Fee Structure Dialog */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingFee ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle></DialogHeader>
          {!editingFee && <CampusBadge />}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name *</Label><Input value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} placeholder="e.g. Tuition Fee" /></div>
            <div className="grid gap-2">
              <Label>Class</Label>
              <Select value={feeForm.classId || '__all__'} onValueChange={(v) => setFeeForm({ ...feeForm, classId: v === '__all__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="All Classes (School-wide)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Classes (School-wide)</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select a class for class-specific fee, or leave as &quot;All Classes&quot; for school-wide default</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Amount *</Label><Input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} placeholder="0" /></div>
              <div className="grid gap-2">
                <Label>Frequency *</Label>
                <Select value={feeForm.frequency} onValueChange={(v) => setFeeForm({ ...feeForm, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{frequencies.map((f) => <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2"><Label>Description</Label><Input value={feeForm.description} onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })} placeholder="Optional description" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveFee} disabled={saving || !feeForm.name || !feeForm.amount}>{saving ? 'Saving...' : editingFee ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Generate Dialog */}
      <GenerateInvoiceDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        fees={fees}
        classes={classes}
        onSuccess={handleBatchGenerateSuccess}
      />
      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Title *</Label><Input value={expenseForm.title} onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} placeholder="e.g. Monthly Electricity Bill" /></div>
            <div className="grid gap-2"><Label>Description</Label><Textarea value={expenseForm.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Optional description" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Amount (Rs.) *</Label><Input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="0" /></div>
              <div className="grid gap-2"><Label>Date *</Label><Input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Category *</Label>
              <Select value={expenseForm.categoryId} onValueChange={(v) => setExpenseForm({ ...expenseForm, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {expenseCategories.length === 0 && <p className="text-xs text-muted-foreground">No categories yet. Go to &quot;Manage Categories&quot; to add some.</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Vendor</Label><Input value={expenseForm.vendor} onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })} placeholder="e.g. WAPDA" /></div>
              <div className="grid gap-2"><Label>Receipt No.</Label><Input value={expenseForm.receiptNo} onChange={(e) => setExpenseForm({ ...expenseForm, receiptNo: e.target.value })} placeholder="e.g. REC-001" /></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveExpense} disabled={saving || !expenseForm.title || !expenseForm.amount || !expenseForm.date || !expenseForm.categoryId}>{saving ? 'Saving...' : editingExpense ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Manage Expense Categories</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            {expenseCategories.length === 0 && (
              <div className="rounded-lg border bg-muted/50 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">No categories yet. Seed the default categories to get started.</p>
                <Button size="sm" onClick={handleSeedCategories}><Zap className="mr-2 h-4 w-4" />Seed Default Categories</Button>
              </div>
            )}
            {expenseCategories.length > 0 && (
              <div className="max-h-60 overflow-y-auto space-y-2">
                {expenseCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.name}</span>
                      {cat.isCustom && <Badge variant="outline" className="text-xs">Custom</Badge>}
                      {cat._count && <span className="text-xs text-muted-foreground">({cat._count.expenses})</span>}
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteCategory(cat.id)} title={cat._count && cat._count.expenses > 0 ? 'Cannot delete: has expenses' : 'Delete category'}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="New category name..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && newCatName.trim() && handleCreateCategory()} />
              <Button onClick={handleCreateCategory} disabled={!newCatName.trim()}><Plus className="h-4 w-4" /></Button>
            </div>
            {expenseCategories.length > 0 && (
              <Button size="sm" variant="outline" className="w-full" onClick={handleSeedCategories}><Zap className="mr-2 h-4 w-4" />Seed Missing Defaults</Button>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Fee Dialog (reusable) */}
      <PayFeeDialog
        open={payFeeDialogOpen}
        onOpenChange={(v) => { setPayFeeDialogOpen(v); if (!v) setPayingStudentId(null) }}
        invoices={pendingFees.filter(f => payingStudentId ? f.studentId === payingStudentId : true) as PayableInvoice[]}
        preSelectedInvoiceId={payPreSelectedInvoiceId}
        studentName={(() => { const inv = pendingFees.find(f => f.studentId === payingStudentId); return inv?.student ? `${inv.student.firstName} ${inv.student.lastName}` : undefined })()}
        onSuccess={handlePayFeeSuccess}
      />

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (confirmAction) await confirmAction(); setConfirmOpen(false) }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ProtectedRoute>
  )
}
