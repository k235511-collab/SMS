import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { FinanceService } from './finance.service'
import { FinanceCronService } from './finance-cron.service'
import {
  CreateFeeStructureDto,
  UpdateFeeStructureDto,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  GetInvoicesDto,
  GetPaymentsDto,
  GetPendingFeesDto,
  BatchGenerateInvoicesDto,
  PreviewInvoicesQueryDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  CreateExpenseDto,
  UpdateExpenseDto,
} from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Finance')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(TenantGuard)
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly financeCronService: FinanceCronService,
  ) { }

  // ─── Fee Structures ──────────────────────────────────────────

  @Post('fee-structures')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Create a fee structure' })
  @ApiResponse({ status: 201, description: 'Fee structure created' })
  createFeeStructure(@TenantId() schoolId: string, @Body() dto: CreateFeeStructureDto, @CampusId() campusId?: string) {
    return this.financeService.createFeeStructure(schoolId, dto, campusId)
  }

  @Get('fee-structures')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List fee structures' })
  @ApiResponse({ status: 200, description: 'Paginated fee structures' })
  findAllFeeStructures(
    @TenantId() schoolId: string,
    @Query() query: PaginationDto,
    @Query('classId') classId?: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.findAllFeeStructures(schoolId, query, classId, campusId)
  }

  @Get('fee-structures/:id')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get fee structure by ID' })
  @ApiResponse({ status: 200, description: 'Fee structure details' })
  findFeeStructureById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.findFeeStructureById(id, schoolId)
  }

  @Patch('fee-structures/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Update a fee structure' })
  @ApiResponse({ status: 200, description: 'Fee structure updated' })
  updateFeeStructure(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateFeeStructureDto) {
    return this.financeService.updateFeeStructure(id, schoolId, dto)
  }

  // ─── Invoices ─────────────────────────────────────────────────

  @Post('invoices')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Create an invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  createInvoice(@TenantId() schoolId: string, @Body() dto: CreateInvoiceDto) {
    return this.financeService.createInvoice(schoolId, dto)
  }

  @Get('invoices')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List invoices' })
  @ApiResponse({ status: 200, description: 'Paginated invoices' })
  findAllInvoices(@TenantId() schoolId: string, @Query() query: GetInvoicesDto, @CampusId() campusId?: string) {
    return this.financeService.findAllInvoices(schoolId, query, campusId)
  }

  @Get('invoices/preview')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Preview batch invoice generation — returns students with fee/discount/outstanding info' })
  @ApiResponse({ status: 200, description: 'Preview data for batch invoice generation' })
  previewBatchInvoices(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query() dto: PreviewInvoicesQueryDto,
  ) {
    return this.financeCronService.previewBatchInvoices(schoolId, { ...dto, campusId: dto.campusId || campusId })
  }

  @Get('invoices/:id')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get invoice by ID with payments' })
  @ApiResponse({ status: 200, description: 'Invoice details with payments' })
  findInvoiceById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.findInvoiceById(id, schoolId)
  }

  @Patch('invoices/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated' })
  updateInvoice(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateInvoiceDto) {
    return this.financeService.updateInvoice(id, schoolId, dto)
  }

  @Delete('invoices/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Hard delete an invoice from database' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  deleteInvoice(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.deleteInvoice(id, schoolId)
  }

  @Post('invoices/bulk-delete')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Bulk delete invoices' })
  @HttpCode(HttpStatus.OK)
  bulkDeleteInvoices(@TenantId() schoolId: string, @Body() body: { ids: string[] }) {
    return this.financeService.bulkDeleteInvoices(body.ids, schoolId)
  }

  // ─── Payments ─────────────────────────────────────────────────

  @Post('payments')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  recordPayment(@TenantId() schoolId: string, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayment(schoolId, dto)
  }

  @Get('payments')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List all payments for school' })
  @ApiResponse({ status: 200, description: 'Paginated payments' })
  findAllPayments(@TenantId() schoolId: string, @Query() query: GetPaymentsDto, @CampusId() campusId?: string) {
    return this.financeService.findAllPayments(schoolId, query, campusId)
  }

  @Get('payments-trash')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List soft-deleted payments (trash)' })
  @ApiResponse({ status: 200, description: 'Paginated deleted payments' })
  findDeletedPayments(@TenantId() schoolId: string, @Query() query: GetPaymentsDto, @CampusId() campusId?: string) {
    return this.financeService.findDeletedPayments(schoolId, query, campusId)
  }

  @Get('payments/invoice/:invoiceId')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get payments for an invoice' })
  @ApiResponse({ status: 200, description: 'Payments list' })
  getPaymentsByInvoice(@Param('invoiceId') invoiceId: string, @TenantId() schoolId: string) {
    return this.financeService.getPaymentsByInvoice(invoiceId, schoolId)
  }

  @Delete('payments/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Soft delete payment and move to trash' })
  @ApiResponse({ status: 200, description: 'Payment moved to trash' })
  softDeletePayment(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.softDeletePayment(id, schoolId)
  }

  @Post('payments/bulk-delete')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Bulk soft delete payments' })
  @HttpCode(HttpStatus.OK)
  bulkSoftDeletePayments(@TenantId() schoolId: string, @Body() body: { ids: string[] }) {
    return this.financeService.bulkSoftDeletePayments(body.ids, schoolId)
  }

  @Patch('payments/:id/restore')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Restore a soft-deleted payment' })
  @ApiResponse({ status: 200, description: 'Payment restored' })
  restorePayment(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.restorePayment(id, schoolId)
  }

  @Delete('payments/:id/permanent')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Permanently delete a trashed payment' })
  @ApiResponse({ status: 200, description: 'Payment permanently deleted' })
  permanentDeletePayment(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.permanentDeletePayment(id, schoolId)
  }

  // ─── Summary ──────────────────────────────────────────────────

  @Get('summary')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get finance summary for school' })
  @ApiResponse({ status: 200, description: 'Finance summary' })
  getSummary(
    @TenantId() schoolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CampusId() campusId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.financeService.getFinanceSummary(schoolId, startDate, endDate, campusId, academicYearId)
  }

  // ─── Charts & Analytics ────────────────────────────────────────

  @Get('daily-collection')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get daily fee collection data for charts' })
  @ApiResponse({ status: 200, description: 'Daily collection data' })
  getDailyCollection(
    @TenantId() schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getDailyCollection(schoolId, startDate, endDate, campusId)
  }

  @Get('yearly-collection')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get yearly fee collection data for charts' })
  @ApiResponse({ status: 200, description: 'Yearly collection data' })
  getYearlyCollection(
    @TenantId() schoolId: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getYearlyCollection(schoolId, campusId)
  }

  @Get('monthly-collection')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get monthly fee collection data for charts' })
  @ApiResponse({ status: 200, description: 'Monthly collection data' })
  getMonthlyCollection(
    @TenantId() schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('academicYearId') academicYearId?: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getMonthlyCollection(schoolId, startDate, endDate, campusId, academicYearId)
  }

  @Get('top-defaulters')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get top fee defaulters' })
  @ApiResponse({ status: 200, description: 'Top defaulters list' })
  getTopDefaulters(
    @TenantId() schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getTopDefaulters(schoolId, startDate, endDate, limit ? parseInt(limit) : 10, campusId)
  }

  @Get('top-discounts')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get students with highest discounts' })
  @ApiResponse({ status: 200, description: 'Top discounts list' })
  getTopDiscounts(
    @TenantId() schoolId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getTopDiscounts(schoolId, startDate, endDate, limit ? parseInt(limit) : 10, campusId)
  }

  @Get('pending-fees')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get all pending/overdue fees' })
  @ApiResponse({ status: 200, description: 'Paginated pending fees' })
  getPendingFees(
    @TenantId() schoolId: string,
    @Query() query: GetPendingFeesDto,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getPendingFees(schoolId, query, campusId)
  }

  // ─── Expense Categories ────────────────────────────────────────

  @Post('expense-categories')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Create an expense category' })
  createExpenseCategory(@TenantId() schoolId: string, @Body() dto: CreateExpenseCategoryDto) {
    return this.financeService.createExpenseCategory(schoolId, dto)
  }

  @Get('expense-categories')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List all expense categories' })
  findAllExpenseCategories(@TenantId() schoolId: string) {
    return this.financeService.findAllExpenseCategories(schoolId)
  }

  @Patch('expense-categories/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Update an expense category' })
  updateExpenseCategory(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.financeService.updateExpenseCategory(id, schoolId, dto)
  }

  @Delete('expense-categories/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Delete an expense category' })
  deleteExpenseCategory(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.deleteExpenseCategory(id, schoolId)
  }

  @Post('expense-categories/seed-defaults')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Seed default expense categories' })
  seedDefaultCategories(@TenantId() schoolId: string) {
    return this.financeService.seedDefaultCategories(schoolId)
  }

  // ─── Expenses ─────────────────────────────────────────────────

  @Post('expenses')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Create an expense' })
  createExpense(@TenantId() schoolId: string, @Body() dto: CreateExpenseDto, @CampusId() campusId?: string) {
    return this.financeService.createExpense(schoolId, dto, campusId)
  }

  @Get('expenses')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'List all expenses (paginated)' })
  findAllExpenses(
    @TenantId() schoolId: string,
    @Query() query: PaginationDto & { startDate?: string; endDate?: string; categoryId?: string },
    @CampusId() campusId?: string,
  ) {
    return this.financeService.findAllExpenses(schoolId, query, campusId)
  }

  @Patch('expenses/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Update an expense' })
  updateExpense(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateExpenseDto) {
    return this.financeService.updateExpense(id, schoolId, dto)
  }

  @Delete('expenses/:id')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Delete an expense' })
  deleteExpense(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.financeService.deleteExpense(id, schoolId)
  }

  @Get('expense-summary')
  @RequirePermission(Permission.READ_FINANCE)
  @ApiOperation({ summary: 'Get expense summary totals' })
  getExpenseSummary(
    @TenantId() schoolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CampusId() campusId?: string,
  ) {
    return this.financeService.getExpenseSummary(schoolId, startDate, endDate, campusId)
  }

  // ─── Batch & Automation ───────────────────────────────────────

  @Post('invoices/batch-generate')
  @RequirePermission(Permission.CREATE_FINANCE)
  @ApiOperation({ summary: 'Batch generate invoices for a fee structure (class or all students)' })
  @ApiResponse({ status: 200, description: 'Batch generation result' })
  @HttpCode(HttpStatus.OK)
  batchGenerateInvoices(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: BatchGenerateInvoicesDto
  ) {
    return this.financeCronService.batchGenerateInvoices(schoolId, { ...dto, campusId: dto.campusId || campusId })
  }

  @Post('invoices/check-overdue')
  @RequirePermission(Permission.UPDATE_FINANCE)
  @ApiOperation({ summary: 'Manually trigger overdue invoice detection' })
  @ApiResponse({ status: 200, description: 'Overdue check complete' })
  @HttpCode(HttpStatus.OK)
  async checkOverdue() {
    await this.financeCronService.markOverdueInvoices()
    return { message: 'Overdue invoice check completed' }
  }
}
