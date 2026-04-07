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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CurrentUser, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadsService } from '../uploads/uploads.service'
import type { Request } from 'express'

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(TenantGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload own avatar' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded' })
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const currentUser = await this.usersService.findById(user.userId, user.schoolId)
    const oldAvatar = currentUser.avatar

    const avatarUrl = await this.uploadsService.saveFile(file, 'avatars')
    const updatedUser = await this.usersService.updateAvatar(user.userId, user.schoolId, avatarUrl)

    if (oldAvatar) {
      await this.uploadsService.deleteFile(oldAvatar)
    }

    return updatedUser
  }

  @Delete('me/avatar')
  @ApiOperation({ summary: 'Delete own avatar' })
  @ApiResponse({ status: 204, description: 'Avatar deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAvatar(@CurrentUser() user: any) {
    const currentUser = await this.usersService.findById(user.userId, user.schoolId)
    if (currentUser.avatar) {
      await this.uploadsService.deleteFile(currentUser.avatar)
      await this.usersService.updateAvatar(user.userId, user.schoolId, null)
    }
  }

  @Post()
  @RequirePermission(Permission.CREATE_USER)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@TenantId() schoolId: string, @Body() dto: CreateUserDto, @CampusId() campusId?: string) {
    return this.usersService.create(schoolId, dto, campusId)
  }

  @Get()
  @RequirePermission(Permission.READ_USER)
  @ApiOperation({ summary: 'List users in current school' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  findAll(@TenantId() schoolId: string, @Query() query: PaginationDto, @CampusId() campusId?: string) {
    return this.usersService.findAll(schoolId, query, campusId)
  }

  // ── Must be above :id so NestJS matches "me" literally ──
  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (firstName, lastName, phone)' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateMe(
    @CurrentUser() user: { userId: string; schoolId: string },
    @Body() dto: UpdateUserDto,
  ) {
    // Only allow safe fields — strip anything sensitive
    const safeDto: UpdateUserDto = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    }
    return this.usersService.update(user.userId, user.schoolId, safeDto)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_USER)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  findById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.usersService.findById(id, schoolId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_USER)
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, schoolId, dto)
  }

  @Post(':id/reset-password')
  @RequirePermission(Permission.UPDATE_USER)
  @ApiOperation({ summary: 'Reset a user password (admin) — returns a temporary password' })
  @ApiResponse({ status: 200, description: 'Temporary password returned' })
  resetPassword(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CurrentUser() actor: { userId: string; campusId?: string | null },
    @Req() req: Request,
  ) {
    return this.usersService.resetPassword(id, schoolId, actor.userId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      campusId: actor.campusId ?? null,
    })
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_USER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  remove(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.usersService.remove(id, schoolId)
  }
}
