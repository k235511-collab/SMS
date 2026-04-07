import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password: string

  @ApiPropertyOptional({ example: 'demo-school', description: 'School slug identifier' })
  @IsOptional()
  @IsString()
  schoolSlug?: string
}

export class RegisterDto {
  @ApiProperty({ example: 'user@demo.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string

  @ApiProperty({ example: 'demo-school', description: 'School slug identifier' })
  @IsString()
  schoolSlug: string

  @ApiPropertyOptional({ example: 'student', description: 'Role slug (defaults to student)' })
  @IsOptional()
  @IsString()
  roleSlug?: string
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT refresh token' })
  @IsString()
  refreshToken: string
}

export class PlatformLoginDto {
  @ApiProperty({ example: 'platform@sms.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'platform123' })
  @IsString()
  @MinLength(6)
  password: string
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string

  @ApiProperty({ description: 'New password (min 6 chars)' })
  @IsString()
  @MinLength(6)
  newPassword: string
}

export class GoogleSignInDto {
  @ApiProperty({ description: 'Google ID token from OAuth' })
  @IsString()
  credential: string

  @ApiPropertyOptional({ description: 'Optional school slug to scope auth' })
  @IsOptional()
  @IsString()
  schoolSlug?: string
}
