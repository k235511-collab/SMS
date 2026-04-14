import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  GetInvoicesDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from './dto'
import { calculateInvoiceDiscountFields, calculateInvoiceStatus } from './finance.utils'

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) { }

  // ═══════════════════════════════════════════════════════════════
  // FEE STRUCTURES
  // ═══════════════════════════════════════════════════════════════

  async createFeeStructure(schoolId: string, dto: CreateFeeStructureDto, campusId?: string) {
    if (!campusId) throw new BadRequestException('Campus is required to create a fee structure')
    return this.prisma.feeStructure.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        frequency: dto.frequency,
        dueDay: dto.dueDay,
        classId: dto.classId || null,
        schoolId,
        campusId,
      },
      include: {
        class: { select: { id: true, name: true } },
      },
    })
  }

  async findAllFeeStructures(schoolId: string, query: PaginationDto, classId?: string, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    if (classId) {
      where.classId = classId
    }
    if (campusId) {
      where.campusId = campusId
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feeStructure.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          _count: { select: { invoices: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.feeStructure.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findFeeStructureById(id: string, schoolId: string) {
    const fs = await this.prisma.feeStructure.findFirst({
      where: { id, schoolId },
    })

    if (!fs) {
      throw new NotFoundException(`Fee structure with ID "${id}" not found`)
    }

    return fs
  }

  async updateFeeStructure(id: string, schoolId: string, dto: UpdateFeeStructureDto) {
    await this.findFeeStructureById(id, schoolId)

    const data: any = { ...dto }
    // Allow explicitly setting classId to null (school-wide)
    if ('classId' in dto) {
      data.classId = dto.classId || null
    }

    return this.prisma.feeStructure.update({
      where: { id },
      data,
      include: {
        class: { select: { id: true, name: true } },
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // INVOICES
  // ═══════════════════════════════════════════════════════════════

  async createInvoice(schoolId: string, dto: CreateInvoiceDto) {
    // Validate student belongs to school
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    })

    if (!student) {
      throw new NotFoundException('Student not found in this school')
    }

    const parsedDueDate = new Date(dto.dueDate)

    // Look up enrollment discount for the student
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    })
    let discountFields = calculateInvoiceDiscountFields(dto.totalAmount)
    if (currentYear) {
      const enrollment = await this.prisma.studentEnrollment.findUnique({
        where: { studentId_academicYearId: { studentId: dto.studentId, academicYearId: currentYear.id } },
        select: { discountType: true, discountValue: true },
      })
      discountFields = calculateInvoiceDiscountFields(dto.totalAmount, enrollment)
    }

    return this.prisma.invoice.create({
      data: {
        invoiceNo: dto.invoiceNo,
        grossAmount: discountFields.grossAmount,
        discountType: discountFields.discountType,
        discountValue: discountFields.discountValue,
        discountAmount: discountFields.discountAmount,
        totalAmount: discountFields.totalAmount,
        dueDate: parsedDueDate,
        notes: dto.notes,
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        schoolId,
        academicYearId: currentYear?.id ?? null,
      },
      include: {
        student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
      },
    })
  }

  async findAllInvoices(schoolId: string, query: GetInvoicesDto, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) {
      where.student = {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    }

    if (query.status) where.status = query.status
    if (query.studentId) where.studentId = query.studentId
    if (query.search) {
      where.invoiceNo = { contains: query.search, mode: 'insensitive' }
    }

    if (query.startDate || query.endDate) {
      where.dueDate = {}
      if (query.startDate) where.dueDate.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: {
          student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
          feeStructure: { select: { id: true, name: true } },
          academicYear: { select: { name: true } },
          _count: { select: { feePayments: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findInvoiceById(id: string, schoolId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, schoolId },
      include: {
        student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
        feeStructure: { select: { id: true, name: true, amount: true } },
        feePayments: { where: { deletedAt: null }, orderBy: { paidAt: 'desc' } },
      },
    })

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID "${id}" not found`)
    }

    return invoice
  }

  async updateInvoice(id: string, schoolId: string, dto: UpdateInvoiceDto) {
    await this.findInvoiceById(id, schoolId)

    const data: any = { ...dto }
    if (dto.dueDate) data.dueDate = new Date(dto.dueDate)

    return this.prisma.invoice.update({
      where: { id },
      data,
    })
  }

  async deleteInvoice(id: string, schoolId: string) {
    await this.findInvoiceById(id, schoolId)
    return this.prisma.invoice.delete({ where: { id } })
  }

  async bulkDeleteInvoices(ids: string[], schoolId: string) {
    const result = await this.prisma.invoice.deleteMany({
      where: { id: { in: ids }, schoolId },
    })
    return { deleted: result.count }
  }

  async bulkSoftDeletePayments(ids: string[], schoolId: string) {
    let deleted = 0
    for (const id of ids) {
      try {
        await this.softDeletePayment(id, schoolId)
        deleted++
      } catch {
        // skip not found
      }
    }
    return { deleted }
  }

  async restorePayment(id: string, schoolId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.feePayment.findFirst({
        where: { id, schoolId, deletedAt: { not: null } },
        include: {
          invoice: {
            select: {
              id: true,
              totalAmount: true,
              paidAmount: true,
              dueDate: true,
            },
          },
        },
      })

      if (!payment) {
        throw new NotFoundException('Deleted payment not found')
      }

      const invoiceTotal = Number(payment.invoice.totalAmount)
      const invoicePaid = Number(payment.invoice.paidAmount)
      const paymentAmount = Number(payment.amount)
      const newPaidAmount = invoicePaid + paymentAmount

      const newStatus = calculateInvoiceStatus(newPaidAmount, invoiceTotal)

      await tx.invoice.update({
        where: { id: payment.invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      })

      await tx.feePayment.update({
        where: { id },
        data: { deletedAt: null },
      })

      return { success: true }
    })
  }

  async permanentDeletePayment(id: string, schoolId: string) {
    const payment = await this.prisma.feePayment.findFirst({
      where: { id, schoolId, deletedAt: { not: null } },
    })
    if (!payment) {
      throw new NotFoundException('Deleted payment not found')
    }
    await this.prisma.feePayment.delete({ where: { id } })
    return { success: true }
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENTS
  // ═══════════════════════════════════════════════════════════════

  async recordPayment(schoolId: string, dto: RecordPaymentDto) {
    // Use interactive transaction with row-level locking to prevent race conditions
    return this.prisma.$transaction(async (tx) => {
      // Lock the invoice row with FOR UPDATE to prevent concurrent overpayment
      const invoiceRows = await tx.$queryRaw<any[]>`
        SELECT * FROM invoices
        WHERE id = ${dto.invoiceId} AND "schoolId" = ${schoolId}
        FOR UPDATE
      `

      if (!invoiceRows || invoiceRows.length === 0) {
        throw new NotFoundException('Invoice not found in this school')
      }

      const invoice = invoiceRows[0]
      const currentPaid = Number(invoice.paidAmount)
      const totalAmount = Number(invoice.totalAmount)
      const newPaidAmount = currentPaid + dto.amount

      if (newPaidAmount > totalAmount) {
        throw new BadRequestException('Payment amount exceeds remaining balance')
      }

      const newStatus = calculateInvoiceStatus(newPaidAmount, totalAmount)

      const payment = await tx.feePayment.create({
        data: {
          amount: dto.amount,
          method: dto.method,
          referenceNo: dto.referenceNo,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          invoiceId: dto.invoiceId,
          studentId: invoice.studentId,
          schoolId,
        },
        include: {
          invoice: { select: { id: true, invoiceNo: true } },
        },
      })

      await tx.invoice.update({
        where: { id: dto.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      })

      return payment
    })
  }

  async getPaymentsByInvoice(invoiceId: string, schoolId: string) {
    await this.findInvoiceById(invoiceId, schoolId)

    return this.prisma.feePayment.findMany({
      where: { invoiceId, schoolId, deletedAt: null },
      orderBy: { paidAt: 'desc' },
    })
  }

  async findAllPayments(schoolId: string, query: PaginationDto & { startDate?: string; endDate?: string; method?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId, deletedAt: null }
    if (campusId) {
      where.student = {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    }

    if (query.startDate || query.endDate) {
      where.paidAt = {}
      if (query.startDate) where.paidAt.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.paidAt.lte = end
      }
    }

    if (query.method) {
      where.method = query.method
    }

    // Search by student name, roll number, or invoice number
    if (query.search) {
      where.OR = [
        { student: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { student: { rollNumber: { contains: query.search, mode: 'insensitive' } } },
        { invoice: { invoiceNo: { contains: query.search, mode: 'insensitive' } } },
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feePayment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNo: true } },
          student: {
            select: {
              id: true, rollNumber: true, firstName: true, lastName: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { paidAt: 'desc' },
      }),
      this.prisma.feePayment.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findDeletedPayments(schoolId: string, query: PaginationDto & { startDate?: string; endDate?: string; method?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId, deletedAt: { not: null } }
    if (campusId) {
      where.student = {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    }

    if (query.startDate || query.endDate) {
      where.paidAt = {}
      if (query.startDate) where.paidAt.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.paidAt.lte = end
      }
    }

    if (query.method) {
      where.method = query.method
    }

    if (query.search) {
      where.OR = [
        { student: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { student: { rollNumber: { contains: query.search, mode: 'insensitive' } } },
        { invoice: { invoiceNo: { contains: query.search, mode: 'insensitive' } } },
        { referenceNo: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.feePayment.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoiceNo: true } },
          student: {
            select: {
              id: true, rollNumber: true, firstName: true, lastName: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { deletedAt: 'desc' },
      }),
      this.prisma.feePayment.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async softDeletePayment(id: string, schoolId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.feePayment.findFirst({
        where: { id, schoolId, deletedAt: null },
        include: {
          invoice: {
            select: {
              id: true,
              totalAmount: true,
              paidAmount: true,
              status: true,
              dueDate: true,
            },
          },
        },
      })

      if (!payment) {
        throw new NotFoundException('Payment not found')
      }

      const invoiceTotal = Number(payment.invoice.totalAmount)
      const invoicePaid = Number(payment.invoice.paidAmount)
      const paymentAmount = Number(payment.amount)
      const newPaidAmount = Math.max(0, invoicePaid - paymentAmount)

      const isOverdue = new Date(payment.invoice.dueDate) < new Date() && newPaidAmount < invoiceTotal
      const newStatus = calculateInvoiceStatus(newPaidAmount, invoiceTotal, isOverdue)

      await tx.invoice.update({
        where: { id: payment.invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      })

      await tx.feePayment.update({
        where: { id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    })
  }

  async getFinanceSummary(schoolId: string, startDate?: string, endDate?: string, campusId?: string, academicYearId?: string) {
    const where: any = { schoolId }
    if (campusId) {
      where.student = {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    }

    if (startDate || endDate) {
      where.dueDate = {}
      if (startDate) where.dueDate.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }

    // Build campus filter reusable for sub-queries
    const campusFilter: any = campusId
      ? { student: { OR: [{ class: { campusId } }, { classId: null }] } }
      : {}

    // ── Last Month Pending: invoices in current year whose dueDate falls in
    //    the last fully-ended calendar month ──
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    const lastMonthWhere: any = {
      schoolId,
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      dueDate: { gte: lastMonthStart, lte: lastMonthEnd },
      ...campusFilter,
    }
    if (academicYearId) lastMonthWhere.academicYearId = academicYearId

    // ── Last Year Pending: all unpaid invoices from the previous academic year ──
    let lastYearWhere: any | null = null
    if (academicYearId) {
      // Find previous academic year by start date
      const currentAY = await this.prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { startDate: true } })
      if (currentAY) {
        const prevAY = await this.prisma.academicYear.findFirst({
          where: { schoolId, startDate: { lt: currentAY.startDate } },
          orderBy: { startDate: 'desc' },
          select: { id: true },
        })
        if (prevAY) {
          lastYearWhere = {
            schoolId,
            academicYearId: prevAY.id,
            status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
            ...campusFilter,
          }
        }
      }
    }

    const [totalInvoiced, totalCollected, overdueAmount, unpaidCount, overdueCount, totalDiscountAgg, discountInvoiceCount, lastMonthAgg, lastYearAgg] = await this.prisma.$transaction([
      this.prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where,
        _sum: { paidAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: 'OVERDUE' },
        _sum: { totalAmount: true, paidAmount: true },
      }),
      this.prisma.invoice.count({
        where: { ...where, status: 'UNPAID' },
      }),
      this.prisma.invoice.count({
        where: { ...where, status: 'OVERDUE' },
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, discountAmount: { gt: 0 } },
        _sum: { discountAmount: true },
      }),
      this.prisma.invoice.count({
        where: { ...where, discountAmount: { gt: 0 } },
      }),
      // Last month pending
      this.prisma.invoice.aggregate({
        where: lastMonthWhere,
        _sum: { totalAmount: true, paidAmount: true },
      }),
      // Last year (previous academic year) pending
      this.prisma.invoice.aggregate({
        where: lastYearWhere ?? { schoolId, id: 'NONE' }, // no-match fallback
        _sum: { totalAmount: true, paidAmount: true },
      }),
    ])

    const invoiced = Number(totalInvoiced._sum?.totalAmount ?? 0)
    const collected = Number(totalCollected._sum?.paidAmount ?? 0)
    const pending = invoiced - collected
    const overdueAmt = Number(overdueAmount._sum?.totalAmount ?? 0) - Number(overdueAmount._sum?.paidAmount ?? 0)
    const totalDiscount = Number(totalDiscountAgg._sum?.discountAmount ?? 0)
    const lastMonthPending = Number(lastMonthAgg._sum?.totalAmount ?? 0) - Number(lastMonthAgg._sum?.paidAmount ?? 0)
    const lastYearPending = lastYearWhere
      ? Number(lastYearAgg._sum?.totalAmount ?? 0) - Number(lastYearAgg._sum?.paidAmount ?? 0)
      : 0

    return {
      totalRevenue: collected,
      totalInvoiced: invoiced,
      pendingAmount: pending,
      overdueAmount: overdueAmt,
      unpaidInvoices: unpaidCount,
      overdueInvoices: overdueCount,
      totalDiscount,
      discountInvoices: discountInvoiceCount,
      lastMonthPending,
      lastYearPending,
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // DAILY FEE COLLECTION CHART (last 30 days or within date range)
  // ═══════════════════════════════════════════════════════════════

  async getDailyCollection(schoolId: string, startDate: string, endDate: string, campusId?: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const paymentWhere: any = { schoolId, paidAt: { gte: start, lte: end } }
    paymentWhere.deletedAt = null
    if (campusId) {
      paymentWhere.student = {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    }

    // Get all payments within the range
    const payments = await this.prisma.feePayment.findMany({
      where: paymentWhere,
      select: { amount: true, paidAt: true },
    })

    // Get all expenses within the range
    const expenses = await this.prisma.expense.findMany({
      where: {
        schoolId,
        date: { gte: start, lte: end },
      },
      select: { amount: true, date: true },
    })

    // Build daily buckets
    const days: { day: string; collected: number; expenses: number }[] = []
    const cursor = new Date(start)

    while (cursor <= end) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth()
      const d = cursor.getDate()
      const label = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const collected = payments
        .filter(p => {
          const pd = new Date(p.paidAt)
          return pd.getFullYear() === y && pd.getMonth() === m && pd.getDate() === d
        })
        .reduce((s, p) => s + Number(p.amount), 0)

      const expenseTotal = expenses
        .filter(e => {
          const ed = new Date(e.date)
          return ed.getFullYear() === y && ed.getMonth() === m && ed.getDate() === d
        })
        .reduce((s, e) => s + Number(e.amount), 0)

      days.push({ day: label, collected, expenses: expenseTotal })
      cursor.setDate(cursor.getDate() + 1)
    }

    return days
  }

  // ═══════════════════════════════════════════════════════════════
  // MONTHLY FEE COLLECTION CHART
  // ═══════════════════════════════════════════════════════════════

  async getMonthlyCollection(schoolId: string, startDate: string, endDate: string, campusId?: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const campusFilter = campusId ? {
      student: {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    } : {}

    // Get all invoices within the academic year
    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        dueDate: { gte: start, lte: end },
        ...campusFilter,
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
      },
    })

    // Get all payments within the academic year
    const payments = await this.prisma.feePayment.findMany({
      where: {
        schoolId,
        deletedAt: null,
        paidAt: { gte: start, lte: end },
        ...campusFilter,
      },
      select: {
        amount: true,
        paidAt: true,
      },
    })

    // Get all expenses within the academic year
    const expenses = await this.prisma.expense.findMany({
      where: {
        schoolId,
        date: { gte: start, lte: end },
      },
      select: {
        amount: true,
        date: true,
      },
    })

    // Build monthly buckets
    const months: { month: string; receivable: number; collected: number; pending: number; expenses: number }[] = []
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)

    while (cursor <= endMonth) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth()
      const label = cursor.toLocaleString('en-US', { month: 'short', year: '2-digit' })

      // Receivable = sum of totalAmount for invoices due in this month
      const receivable = invoices
        .filter(inv => {
          const d = new Date(inv.dueDate)
          return d.getFullYear() === y && d.getMonth() === m
        })
        .reduce((s, inv) => s + Number(inv.totalAmount), 0)

      // Collected = sum of payments made in this month
      const collected = payments
        .filter(p => {
          const d = new Date(p.paidAt)
          return d.getFullYear() === y && d.getMonth() === m
        })
        .reduce((s, p) => s + Number(p.amount), 0)

      // Expenses = sum of expense amounts in this month
      const expenseTotal = expenses
        .filter(e => {
          const d = new Date(e.date)
          return d.getFullYear() === y && d.getMonth() === m
        })
        .reduce((s, e) => s + Number(e.amount), 0)

      months.push({ month: label, receivable, collected, pending: receivable - collected, expenses: expenseTotal })

      cursor.setMonth(cursor.getMonth() + 1)
    }

    return months
  }

  // ═══════════════════════════════════════════════════════════════
  // YEARLY FEE COLLECTION CHART
  // ═══════════════════════════════════════════════════════════════

  async getYearlyCollection(schoolId: string, campusId?: string) {
    // Get all academic years for this school
    const academicYears = await this.prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'asc' },
      select: { name: true, startDate: true, endDate: true },
    })

    const campusFilter = campusId ? {
      student: {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    } : {}

    const years: { year: string; receivable: number; collected: number; pending: number; expenses: number }[] = []

    for (const ay of academicYears) {
      const start = new Date(ay.startDate)
      const end = new Date(ay.endDate)
      end.setHours(23, 59, 59, 999)

      const [invoiceAgg, paymentAgg, expenseAgg] = await this.prisma.$transaction([
        this.prisma.invoice.aggregate({
          where: { schoolId, dueDate: { gte: start, lte: end }, ...campusFilter },
          _sum: { totalAmount: true },
        }),
        this.prisma.feePayment.aggregate({
          where: { schoolId, deletedAt: null, paidAt: { gte: start, lte: end }, ...campusFilter },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { schoolId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])

      const receivable = Number(invoiceAgg._sum.totalAmount || 0)
      const collected = Number(paymentAgg._sum.amount || 0)
      const expenseTotal = Number(expenseAgg._sum.amount || 0)

      years.push({
        year: ay.name,
        receivable,
        collected,
        pending: receivable - collected,
        expenses: expenseTotal,
      })
    }

    return years
  }

  // ═══════════════════════════════════════════════════════════════
  // TOP FEE DEFAULTERS
  // ═══════════════════════════════════════════════════════════════

  async getTopDefaulters(schoolId: string, startDate: string, endDate: string, limit = 10, campusId?: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const campusFilter = campusId ? {
      student: {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    } : {}

    // Get unpaid/overdue/partial invoices grouped by student
    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        dueDate: { gte: start, lte: end },
        status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
        ...campusFilter,
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    })

    // Aggregate by student
    const studentMap = new Map<string, { student: any; totalDue: number; totalPaid: number }>()
    for (const inv of invoices) {
      const entry = studentMap.get(inv.studentId) || { student: inv.student, totalDue: 0, totalPaid: 0 }
      entry.totalDue += Number(inv.totalAmount)
      entry.totalPaid += Number(inv.paidAmount)
      studentMap.set(inv.studentId, entry)
    }

    // Sort by outstanding balance descending
    const sorted = Array.from(studentMap.values())
      .map(e => ({
        ...e.student,
        totalDue: e.totalDue,
        totalPaid: e.totalPaid,
        outstanding: e.totalDue - e.totalPaid,
      }))
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, limit)

    return sorted
  }

  // ═══════════════════════════════════════════════════════════════
  // TOP DISCOUNTS (students with highest total discounts)
  // ═══════════════════════════════════════════════════════════════

  async getTopDiscounts(schoolId: string, startDate: string, endDate: string, limit = 10, campusId?: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const campusFilter = campusId ? {
      student: {
        OR: [
          { class: { campusId } },
          { classId: null }
        ]
      }
    } : {}

    // Get invoices that have discounts
    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        dueDate: { gte: start, lte: end },
        discountAmount: { gt: 0 },
        ...campusFilter,
      },
      select: {
        discountAmount: true,
        discountType: true,
        discountValue: true,
        grossAmount: true,
        totalAmount: true,
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    })

    // Aggregate by student
    const studentMap = new Map<string, { student: any; totalDiscount: number; invoiceCount: number }>()
    for (const inv of invoices) {
      const entry = studentMap.get(inv.studentId) || { student: inv.student, totalDiscount: 0, invoiceCount: 0 }
      entry.totalDiscount += Number(inv.discountAmount)
      entry.invoiceCount += 1
      studentMap.set(inv.studentId, entry)
    }

    // Sort by total discount descending
    const sorted = Array.from(studentMap.values())
      .map(e => ({
        ...e.student,
        totalDiscount: e.totalDiscount,
        invoiceCount: e.invoiceCount,
      }))
      .sort((a, b) => b.totalDiscount - a.totalDiscount)
      .slice(0, limit)

    return sorted
  }

  // ═══════════════════════════════════════════════════════════════
  // PENDING FEES (students with unpaid/overdue/partial invoices)
  // ═══════════════════════════════════════════════════════════════

  async getPendingFees(schoolId: string, query: PaginationDto & { startDate?: string; endDate?: string; classId?: string; sectionId?: string; status?: string; academicYearId?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = {
      schoolId,
      status: query.status
        ? { in: [query.status] }
        : { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] },
    }
    if (query.academicYearId) {
      where.academicYearId = query.academicYearId
    } else if (query.startDate || query.endDate) {
      where.dueDate = {}
      if (query.startDate) where.dueDate.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.dueDate.lte = end
      }
    }

    // Build student filter merging classId, sectionId and campusId
    const studentFilter: any = { deletedAt: null }
    if (query.classId) studentFilter.classId = query.classId
    if (query.sectionId) studentFilter.sectionId = query.sectionId
    if (campusId) {
      studentFilter.OR = [
        { class: { campusId } },
        { classId: null }
      ]
    }
    where.student = studentFilter

    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { student: { firstName: { contains: query.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: query.search, mode: 'insensitive' } } },
        { student: { rollNumber: { contains: query.search, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: {
          student: {
            select: {
              id: true, rollNumber: true, firstName: true, lastName: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
          feeStructure: { select: { id: true, name: true } },
          academicYear: { select: { name: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  // ═══════════════════════════════════════════════════════════════
  // DELETE INVOICES BY DATE RANGE
  // ═══════════════════════════════════════════════════════════════

  async deleteInvoicesByDateRange(schoolId: string, startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // First delete related payments
    await this.prisma.feePayment.deleteMany({
      where: {
        schoolId,
        invoice: {
          dueDate: { gte: start, lte: end },
        },
      },
    })

    // Then delete invoices
    const result = await this.prisma.invoice.deleteMany({
      where: {
        schoolId,
        dueDate: { gte: start, lte: end },
      },
    })

    return { deleted: result.count }
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPENSE CATEGORIES
  // ═══════════════════════════════════════════════════════════════

  async createExpenseCategory(schoolId: string, dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: { name: dto.name, isCustom: true, schoolId },
    })
  }

  async findAllExpenseCategories(schoolId: string) {
    return this.prisma.expenseCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    })
  }

  async updateExpenseCategory(id: string, schoolId: string, dto: UpdateExpenseCategoryDto) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, schoolId } })
    if (!cat) throw new NotFoundException('Expense category not found')
    return this.prisma.expenseCategory.update({ where: { id }, data: { name: dto.name } })
  }

  async deleteExpenseCategory(id: string, schoolId: string) {
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id, schoolId } })
    if (!cat) throw new NotFoundException('Expense category not found')
    const count = await this.prisma.expense.count({ where: { categoryId: id } })
    if (count > 0) throw new BadRequestException(`Cannot delete category with ${count} expense(s). Delete or reassign them first.`)
    return this.prisma.expenseCategory.delete({ where: { id } })
  }

  async seedDefaultCategories(schoolId: string) {
    const defaults = ['Salaries', 'Utilities', 'Rent', 'Maintenance', 'Transport', 'Stationery', 'Equipment', 'Miscellaneous']
    const existing = await this.prisma.expenseCategory.findMany({ where: { schoolId }, select: { name: true } })
    const existingNames = new Set(existing.map(c => c.name))
    const toCreate = defaults.filter(n => !existingNames.has(n))
    if (toCreate.length === 0) return []
    await this.prisma.expenseCategory.createMany({
      data: toCreate.map(name => ({ name, isCustom: false, schoolId })),
      skipDuplicates: true,
    })
    return this.findAllExpenseCategories(schoolId)
  }

  // ═══════════════════════════════════════════════════════════════
  // EXPENSES
  // ═══════════════════════════════════════════════════════════════

  async createExpense(schoolId: string, dto: CreateExpenseDto, campusId?: string) {
    if (!campusId) throw new BadRequestException('Campus is required to create an expense')
    const cat = await this.prisma.expenseCategory.findFirst({ where: { id: dto.categoryId, schoolId } })
    if (!cat) throw new NotFoundException('Expense category not found')
    return this.prisma.expense.create({
      data: {
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        date: new Date(dto.date),
        receiptNo: dto.receiptNo,
        vendor: dto.vendor,
        categoryId: dto.categoryId,
        schoolId,
        campusId,
      },
      include: { category: { select: { id: true, name: true } } },
    })
  }

  async findAllExpenses(schoolId: string, query: PaginationDto & { startDate?: string; endDate?: string; categoryId?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId

    if (query.startDate || query.endDate) {
      where.date = {}
      if (query.startDate) where.date.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    if (query.categoryId) where.categoryId = query.categoryId

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { vendor: { contains: query.search, mode: 'insensitive' } },
        { receiptNo: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        skip: query.skip,
        take: query.take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async updateExpense(id: string, schoolId: string, dto: UpdateExpenseDto) {
    const exp = await this.prisma.expense.findFirst({ where: { id, schoolId } })
    if (!exp) throw new NotFoundException('Expense not found')
    const data: any = { ...dto }
    if (dto.date) data.date = new Date(dto.date)
    return this.prisma.expense.update({
      where: { id },
      data,
      include: { category: { select: { id: true, name: true } } },
    })
  }

  async deleteExpense(id: string, schoolId: string) {
    const exp = await this.prisma.expense.findFirst({ where: { id, schoolId } })
    if (!exp) throw new NotFoundException('Expense not found')
    return this.prisma.expense.delete({ where: { id } })
  }

  async getExpenseSummary(schoolId: string, startDate?: string, endDate?: string, campusId?: string) {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    const agg = await this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true })
    return { totalExpenses: Number(agg._sum?.amount ?? 0), expenseCount: agg._count }
  }
}
