import { ForbiddenException } from '@nestjs/common'

export const SchoolAccessCode = {
  PLAN_EXPIRED: 'PLAN_EXPIRED',
  SCHOOL_SUSPENDED: 'SCHOOL_SUSPENDED',
} as const

export type SchoolAccessCode = (typeof SchoolAccessCode)[keyof typeof SchoolAccessCode]

export interface SchoolAccessInput {
  schoolId?: string | null
  schoolName?: string | null
  isActive?: boolean | null
  subscriptionExpiresAt?: Date | string | null
}

export interface SchoolAccessAllow {
  allowed: true
}

export interface SchoolAccessDeny {
  allowed: false
  code: SchoolAccessCode
  message: string
  meta: Record<string, unknown>
}

export type SchoolAccessDecision = SchoolAccessAllow | SchoolAccessDeny

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function evaluateSchoolAccess(input: SchoolAccessInput): SchoolAccessDecision {
  if (input.isActive === false) {
    return {
      allowed: false,
      code: SchoolAccessCode.SCHOOL_SUSPENDED,
      message: 'This school is suspended. Please contact support.',
      meta: {
        schoolId: input.schoolId ?? null,
        schoolName: input.schoolName ?? null,
      },
    }
  }

  const expiry = toDate(input.subscriptionExpiresAt)
  if (expiry && expiry.getTime() <= Date.now()) {
    return {
      allowed: false,
      code: SchoolAccessCode.PLAN_EXPIRED,
      message: 'Your subscription plan has expired. Please renew to continue.',
      meta: {
        schoolId: input.schoolId ?? null,
        schoolName: input.schoolName ?? null,
        subscriptionExpiresAt: expiry.toISOString(),
      },
    }
  }

  return { allowed: true }
}

export function assertSchoolAccessOrThrow(input: SchoolAccessInput): void {
  const decision = evaluateSchoolAccess(input)
  if (decision.allowed) {
    return
  }

  throw new ForbiddenException({
    message: decision.message,
    code: decision.code,
    meta: decision.meta,
  })
}
