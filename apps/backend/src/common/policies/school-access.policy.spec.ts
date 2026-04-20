import { ForbiddenException } from '@nestjs/common'
import {
  SchoolAccessCode,
  assertSchoolAccessOrThrow,
  evaluateSchoolAccess,
} from './school-access.policy'

describe('SchoolAccessPolicy', () => {
  it('allows active schools with no expiry', () => {
    const decision = evaluateSchoolAccess({
      schoolId: 'school-1',
      schoolName: 'Alpha School',
      isActive: true,
      subscriptionExpiresAt: null,
    })

    expect(decision.allowed).toBe(true)
  })

  it('denies suspended schools', () => {
    const decision = evaluateSchoolAccess({
      schoolId: 'school-2',
      schoolName: 'Beta School',
      isActive: false,
      subscriptionExpiresAt: null,
    })

    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.code).toBe(SchoolAccessCode.SCHOOL_SUSPENDED)
      expect(decision.meta.schoolId).toBe('school-2')
    }
  })

  it('denies expired subscriptions', () => {
    const decision = evaluateSchoolAccess({
      schoolId: 'school-3',
      schoolName: 'Gamma School',
      isActive: true,
      subscriptionExpiresAt: '2020-01-01T00:00:00.000Z',
    })

    expect(decision.allowed).toBe(false)
    if (!decision.allowed) {
      expect(decision.code).toBe(SchoolAccessCode.PLAN_EXPIRED)
      expect(decision.meta.schoolName).toBe('Gamma School')
    }
  })

  it('throws ForbiddenException with machine-readable payload', () => {
    expect(() =>
      assertSchoolAccessOrThrow({
        schoolId: 'school-4',
        schoolName: 'Delta School',
        isActive: true,
        subscriptionExpiresAt: '2020-01-01T00:00:00.000Z',
      }),
    ).toThrow(ForbiddenException)

    try {
      assertSchoolAccessOrThrow({
        schoolId: 'school-4',
        schoolName: 'Delta School',
        isActive: true,
        subscriptionExpiresAt: '2020-01-01T00:00:00.000Z',
      })
    } catch (error: any) {
      const response = error.getResponse()
      expect(response.code).toBe(SchoolAccessCode.PLAN_EXPIRED)
      expect(response.meta.schoolId).toBe('school-4')
    }
  })
})
