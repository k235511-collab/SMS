import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto, GoogleSignInDto } from './dto'
import { Public, CurrentUser } from '../../common/decorators'
import { PlatformService } from '../platform/platform.service'
import { SubmitSchoolRegistrationDto } from '../platform/dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly platformService: PlatformService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email, password and school slug' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password, dto.schoolSlug)
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user in a school' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already exists in school' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.email,
      dto.password,
      dto.firstName,
      dto.lastName,
      dto.schoolSlug,
    )
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  getMe(
    @CurrentUser()
    user: {
      userId: string
      schoolId: string
      roleId: string
      isPlatformAdmin: boolean
    },
  ) {
    if (user.isPlatformAdmin) {
      return this.authService.getPlatformAdminProfile(user.userId)
    }
    return this.authService.getProfile(user.userId, user.schoolId)
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google OAuth' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid token or unauthorized' })
  googleSignIn(@Body() dto: GoogleSignInDto) {
    return this.authService.googleSignIn(dto.credential, dto.schoolSlug)
  }

  @Get('me/permissions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  @ApiResponse({ status: 200, description: 'List of permission slugs' })
  async getMyPermissions(
    @CurrentUser() user: { userId: string; roleId: string; isPlatformAdmin: boolean },
  ) {
    if (user.isPlatformAdmin) {
      return { permissions: ['*'] }
    }
    const permissions = await this.authService.getUserPermissions(user.userId, user.roleId)
    return { permissions }
  }

  @Get('my-schools')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all schools where user has an account (for school switcher)' })
  @ApiResponse({ status: 200, description: 'List of schools the user can switch to' })
  getMySchools(
    @CurrentUser() user: { userId: string; schoolId: string; isPlatformAdmin: boolean },
  ) {
    if (user.isPlatformAdmin) {
      return { currentSchoolId: null, schools: [] }
    }
    return this.authService.getMySchools(user.userId, user.schoolId)
  }

  @Post('switch-school')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch to a different school (same email must exist)' })
  @ApiResponse({ status: 200, description: 'Switched successfully, new tokens returned' })
  @ApiResponse({ status: 401, description: 'No access to target school' })
  switchSchool(
    @CurrentUser() user: { userId: string; schoolId: string; isPlatformAdmin: boolean },
    @Body() body: { schoolId: string },
  ) {
    if (user.isPlatformAdmin) {
      return { error: 'Platform admins should use impersonate, not switch-school' }
    }
    return this.authService.switchSchool(user.userId, user.schoolId, body.schoolId)
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  changePassword(
    @CurrentUser() user: { userId: string; schoolId: string; isPlatformAdmin: boolean },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.userId,
      user.isPlatformAdmin,
      dto.currentPassword,
      dto.newPassword,
    )
  }

  @Public()
  @Post('register-school')
  @ApiOperation({
    summary: 'Submit a school registration request (public, requires admin approval)',
  })
  @ApiResponse({ status: 201, description: 'Registration submitted for review' })
  @ApiResponse({ status: 409, description: 'Duplicate registration' })
  registerSchool(@Body() dto: SubmitSchoolRegistrationDto) {
    return this.platformService.submitRegistration(dto)
  }
}
