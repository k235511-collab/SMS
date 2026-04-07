import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { SchoolsService } from './schools.service'
import { UpdateSchoolProfileDto } from './dto'
import { RequirePermission, TenantId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'
import { FileInterceptor } from '@nestjs/platform-express'
import { UploadsService } from '../uploads/uploads.service'
import { Delete, HttpCode, HttpStatus } from '@nestjs/common'

@ApiTags('Schools')
@ApiBearerAuth()
@Controller('schools')
@UseGuards(TenantGuard)
export class SchoolsController {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Post('profile/logo')
  @RequirePermission(Permission.UPDATE_SCHOOL)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload school logo' })
  @ApiResponse({ status: 200, description: 'Logo uploaded' })
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() tenantId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const currentSchool = await this.schoolsService.findById(tenantId)
    const oldLogo = currentSchool.logo

    const logoUrl = await this.uploadsService.saveFile(file, 'schools')
    const updatedSchool = await this.schoolsService.updateLogo(tenantId, logoUrl)

    if (oldLogo) {
      await this.uploadsService.deleteFile(oldLogo)
    }

    return updatedSchool
  }

  @Delete('profile/logo')
  @RequirePermission(Permission.UPDATE_SCHOOL)
  @ApiOperation({ summary: 'Delete school logo' })
  @ApiResponse({ status: 204, description: 'Logo deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLogo(@TenantId() tenantId: string) {
    const currentSchool = await this.schoolsService.findById(tenantId)
    if (currentSchool.logo) {
      await this.uploadsService.deleteFile(currentSchool.logo)
      await this.schoolsService.updateLogo(tenantId, null)
    }
  }

  @Get('profile')
  @RequirePermission(Permission.READ_SCHOOL)
  @ApiOperation({ summary: 'Get current school profile' })
  @ApiResponse({ status: 200, description: 'School profile' })
  getProfile(@TenantId() schoolId: string) {
    return this.schoolsService.findById(schoolId)
  }

  @Patch('profile')
  @RequirePermission(Permission.UPDATE_SCHOOL)
  @ApiOperation({ summary: 'Update school profile' })
  @ApiResponse({ status: 200, description: 'School profile updated' })
  updateProfile(@TenantId() schoolId: string, @Body() dto: UpdateSchoolProfileDto) {
    return this.schoolsService.updateProfile(schoolId, dto)
  }

  @Get('stats')
  @RequirePermission(Permission.READ_SCHOOL)
  @ApiOperation({ summary: 'Get school statistics' })
  @ApiResponse({ status: 200, description: 'School stats' })
  getStats(@TenantId() schoolId: string) {
    return this.schoolsService.getStats(schoolId)
  }
}
