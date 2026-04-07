import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { BooksService } from './books.service'
import { IssuesService } from './issues.service'
import { CreateBookDto, UpdateBookDto, IssueBookDto, ReturnBookDto } from './dto'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Library')
@ApiBearerAuth()
@Controller('library')
@UseGuards(TenantGuard)
export class BooksController {
    constructor(
        private readonly booksService: BooksService,
        private readonly issuesService: IssuesService,
    ) { }

    @Post('books')
    @ApiOperation({ summary: 'Add a new book' })
    @RequirePermission(Permission.CREATE_LIBRARY)
    createBook(@TenantId() schoolId: string, @Body() dto: CreateBookDto, @CampusId() campusId?: string) {
        return this.booksService.create(schoolId, dto, campusId)
    }

    @Get('books')
    @ApiOperation({ summary: 'List books' })
    @RequirePermission(Permission.READ_LIBRARY)
    findAllBooks(@TenantId() schoolId: string, @Query('search') search?: string, @Query('category') category?: string, @CampusId() campusId?: string) {
        return this.booksService.findAll(schoolId, { search, category }, campusId)
    }

    @Get('books/:id')
    @ApiOperation({ summary: 'Get book details' })
    @RequirePermission(Permission.READ_LIBRARY)
    findBook(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.booksService.findById(id, schoolId)
    }

    @Patch('books/:id')
    @ApiOperation({ summary: 'Update a book' })
    @RequirePermission(Permission.UPDATE_LIBRARY)
    updateBook(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateBookDto) {
        return this.booksService.update(id, schoolId, dto)
    }

    @Delete('books/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a book' })
    @RequirePermission(Permission.DELETE_LIBRARY)
    removeBook(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.booksService.remove(id, schoolId)
    }

    // ─── Book Issues ────────────────────────────────────
    @Post('issues')
    @ApiOperation({ summary: 'Issue a book to a student' })
    @RequirePermission(Permission.CREATE_LIBRARY)
    issueBook(@TenantId() schoolId: string, @Body() dto: IssueBookDto, @CampusId() campusId?: string) {
        return this.issuesService.issueBook(schoolId, dto, campusId)
    }

    @Patch('issues/:id/return')
    @ApiOperation({ summary: 'Return a book' })
    @RequirePermission(Permission.UPDATE_LIBRARY)
    returnBook(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: ReturnBookDto) {
        return this.issuesService.returnBook(id, schoolId, dto)
    }

    @Get('issues')
    @ApiOperation({ summary: 'List book issues' })
    @RequirePermission(Permission.READ_LIBRARY)
    findIssues(@TenantId() schoolId: string, @Query('status') status?: string, @Query('studentId') studentId?: string, @CampusId() campusId?: string) {
        return this.issuesService.findAll(schoolId, { status, studentId }, campusId)
    }
}
