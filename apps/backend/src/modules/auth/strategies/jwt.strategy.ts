import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

interface JwtPayload {
  sub: string
  schoolId?: string
  roleId?: string
  isPlatformAdmin?: boolean
  teacherId?: string | null
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    })
  }

  validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload')
    }

    return {
      userId: payload.sub,
      schoolId: payload.schoolId ?? null,
      roleId: payload.roleId ?? null,
      isPlatformAdmin: payload.isPlatformAdmin === true,
      teacherId: payload.teacherId ?? null,
    }
  }
}
