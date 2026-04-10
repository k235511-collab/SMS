'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { reportsService } from '@/services/analytics.service'
import { useSession } from '@/context/session-context'
import { DollarSign, FileText, Loader2, Plus, Printer, Receipt, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type FinancialReportResponse = {
  period: {
    startDate: string | null
    endDate: string | null
  }
  totals: {
    totalInvoices: number
    totalPayments: number
    totalInvoiced: number
    totalPaid: number
    outstanding: number
    collectionRate: number
  }
  invoiceStatusBreakdown: Array<{
    status: string
    count: number
    totalAmount: number
    paidAmount: number
  }>
  paymentMethodBreakdown: Array<{
    method: string
    count: number
    amount: number
  }>
  recentPayments: Array<{
    id: string
    amount: number
    method: string
    referenceNo?: string | null
    paidAt: string
    student: {
      id: string
      rollNumber: string
      firstName: string
      lastName: string
    }
    invoice: {
      id: string
      invoiceNo: string
      status: string
      totalAmount: number
      paidAmount: number
    }
  }>
  generatedAt: string
}

type TemplateOption = {
  id: string
  name: string
  description: string
  accentClass: string
}

type CustomSection = {
  id: string
  title: string
  content: string
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'management',
    name: 'Management Summary',
    description: 'Top-line numbers first with clean payment channel details.',
    accentClass: 'border-primary-200 bg-primary-50/40',
  },
  {
    id: 'collections',
    name: 'Collections Focus',
    description: 'Emphasizes outstanding dues and collection rate tracking.',
    accentClass: 'border-warning-500/30 bg-warning-50/20',
  },
  {
    id: 'audit',
    name: 'Audit Print View',
    description: 'Table-heavy layout with concise finance metadata for review.',
    accentClass: 'border-border bg-card',
  },
]

const STORAGE_KEY = 'financial-report-builder.v1'

function formatCurrency(value: number): string {
  return `Rs ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value || 0)}`
}

export default function FinancialReportPage() {
  const { selectedYear } = useSession()

  const [templateId, setTemplateId] = useState('management')
  const [customSections, setCustomSections] = useState<CustomSection[]>([
    { id: 'finance-manager-note', title: 'Finance Manager Note', content: '' },
  ])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<FinancialReportResponse | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (parsed?.templateId && TEMPLATE_OPTIONS.some((item) => item.id === parsed.templateId)) {
        setTemplateId(parsed.templateId)
      }

      if (typeof parsed?.startDate === 'string') setStartDate(parsed.startDate)
      if (typeof parsed?.endDate === 'string') setEndDate(parsed.endDate)

      if (Array.isArray(parsed?.customSections)) {
        setCustomSections(
          parsed.customSections
            .slice(0, 8)
            .map((item: any, index: number) => ({
              id: item?.id || `custom-${index + 1}`,
              title: item?.title || 'Custom Section',
              content: item?.content || '',
            })),
        )
      }
    } catch {
      // Ignore invalid local draft config.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        templateId,
        startDate,
        endDate,
        customSections,
      }),
    )
  }, [templateId, startDate, endDate, customSections])

  const activeTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.id === templateId) || TEMPLATE_OPTIONS[0],
    [templateId],
  )

  const methodMax = useMemo(() => {
    if (!reportData?.paymentMethodBreakdown.length) return 1
    return Math.max(...reportData.paymentMethodBreakdown.map((item) => item.amount), 1)
  }, [reportData])

  const addCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: 'Custom Section',
        content: '',
      },
    ])
  }

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    )
  }

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id))
  }

  const generateReport = async () => {
    if (startDate && endDate && startDate > endDate) {
      toast.error('Please choose a valid date range')
      return
    }

    setLoadingReport(true)
    try {
      const res = await reportsService.generateFinancialReport(startDate || undefined, endDate || undefined)
      if (!res.success || !res.data) {
        toast.error(res.message || 'Unable to generate financial report')
        return
      }

      setReportData(res.data as FinancialReportResponse)
      toast.success('Financial report loaded')
    } finally {
      setLoadingReport(false)
    }
  }

  return (
    <ProtectedRoute permission="reports:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build fee collection reports with dues tracking and payment channel breakdown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedYear?.name || 'Academic Year'}</Badge>
            <Button variant="outline" onClick={() => window.print()} disabled={!reportData}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Report Filters</CardTitle>
                <CardDescription>Generate finance summary for full period or selected date range.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  </div>
                </div>

                <Button className="w-full" onClick={generateReport} disabled={loadingReport}>
                  {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generate Financial Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template and Notes</CardTitle>
                <CardDescription>Switch report style and maintain editable finance notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{activeTemplate.description}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Sections</Label>
                    <Button variant="outline" size="sm" onClick={addCustomSection}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {customSections.map((section) => (
                      <div key={section.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={section.title}
                            onChange={(event) => updateCustomSection(section.id, { title: event.target.value })}
                            placeholder="Section title"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeCustomSection(section.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(event) => updateCustomSection(section.id, { content: event.target.value })}
                          placeholder="Section content"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={activeTemplate.accentClass}>
            {!reportData ? (
              <CardContent className="p-10 text-center text-muted-foreground">
                Generate a financial report to preview totals, invoice states, and payment channels.
              </CardContent>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Financial Summary</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reportData.period.startDate && reportData.period.endDate
                        ? `${reportData.period.startDate} to ${reportData.period.endDate}`
                        : 'All available records'}
                    </p>
                  </div>
                  <Badge variant="outline">{activeTemplate.name}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Total Invoiced</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.totals.totalInvoiced)}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.totals.totalPaid)}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-lg font-semibold">{formatCurrency(reportData.totals.outstanding)}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <p className="text-xs text-muted-foreground">Collection Rate</p>
                    <p className="text-lg font-semibold">{reportData.totals.collectionRate}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Invoice Status Breakdown</h3>
                  {reportData.invoiceStatusBreakdown.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No invoice records found for selected period.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Status</th>
                            <th className="px-3 py-2 text-left font-medium">Count</th>
                            <th className="px-3 py-2 text-left font-medium">Amount</th>
                            <th className="px-3 py-2 text-left font-medium">Paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.invoiceStatusBreakdown.map((item) => (
                            <tr key={item.status} className="border-t">
                              <td className="px-3 py-2">{item.status}</td>
                              <td className="px-3 py-2">{item.count}</td>
                              <td className="px-3 py-2">{formatCurrency(item.totalAmount)}</td>
                              <td className="px-3 py-2">{formatCurrency(item.paidAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Payment Methods</h3>
                  {reportData.paymentMethodBreakdown.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No fee payments found for selected period.
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      {reportData.paymentMethodBreakdown.map((item) => (
                        <div key={item.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{item.method}</span>
                            <span className="text-muted-foreground">
                              {item.count} payments | {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className="h-full bg-primary-500/75"
                              style={{ width: `${(item.amount / methodMax) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Recent Payments</h3>
                  {reportData.recentPayments.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No recent payments available.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Date</th>
                            <th className="px-3 py-2 text-left font-medium">Student</th>
                            <th className="px-3 py-2 text-left font-medium">Invoice</th>
                            <th className="px-3 py-2 text-left font-medium">Method</th>
                            <th className="px-3 py-2 text-left font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.recentPayments.map((payment) => (
                            <tr key={payment.id} className="border-t">
                              <td className="px-3 py-2">{new Date(payment.paidAt).toLocaleDateString()}</td>
                              <td className="px-3 py-2">
                                {payment.student.firstName} {payment.student.lastName} ({payment.student.rollNumber})
                              </td>
                              <td className="px-3 py-2">{payment.invoice.invoiceNo}</td>
                              <td className="px-3 py-2">{payment.method}</td>
                              <td className="px-3 py-2">{formatCurrency(payment.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {customSections.map((section) => (
                    <div key={section.id} className="rounded-lg border bg-background p-4">
                      <h4 className="font-medium text-foreground">{section.title || 'Custom Section'}</h4>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {section.content || 'No content provided.'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Generated on {new Date(reportData.generatedAt).toLocaleString()}.
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" /> Finance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Invoices</p>
                <p className="font-medium">{reportData?.totals.totalInvoices ?? '-'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Total Payments</p>
                <p className="font-medium">{reportData?.totals.totalPayments ?? '-'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="font-medium">{startDate || 'All time'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="font-medium">{endDate || 'All time'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
