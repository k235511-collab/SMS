import { Test, TestingModule } from '@nestjs/testing'
import { ExamsService } from './exams.service'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'
import { PaginatedResult } from '../../common/dto'

describe('ExamsService – findAllExams teacher scoping', () => {
  let service: ExamsService
  let prisma: { exam: { findMany: jest.Mock; count: jest.Mock }; teacher: { findFirst: jest.Mock }; $transaction: jest.Mock }
  let teacherScope: { getScope: jest.Mock }

  const SCHOOL_ID = 'school-1'
  const TEACHER_ID = 'teacher-1'
  const CLASS_A = 'class-a'
  const CLASS_B = 'class-b'
  const SECTION_1 = 'section-1'
  const SUBJECT_X = 'subject-x'

  beforeEach(async () => {
    prisma = {
      exam: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      teacher: { findFirst: jest.fn().mockResolvedValue({ id: TEACHER_ID }) },
      $transaction: jest.fn(async (args: any) => {
        if (Array.isArray(args)) return Promise.all(args)
        return args(prisma)
      }),
    }

    teacherScope = {
      getScope: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherScopeService, useValue: teacherScope },
      ],
    }).compile()

    service = module.get<ExamsService>(ExamsService)
  })

  // Helper to call findAllExams for a teacher
  const callFindAll = (query = {}) =>
    service.findAllExams(SCHOOL_ID, { page: 1, pageSize: 20, ...query } as any, undefined, TEACHER_ID, null)

  // ─── Scenario 1: Class teacher with subjectIds ──────────────────────
  it('class teacher sees all subjects for own class + restricted subjects for other classes', async () => {
    teacherScope.getScope.mockResolvedValue({
      classIds: [CLASS_A, CLASS_B],
      sectionIds: [SECTION_1],
      subjectIds: [SUBJECT_X],
      classTeacherOfId: CLASS_A,
    })

    const fakeExams = [{ id: 'exam-1' }]
    prisma.$transaction.mockResolvedValue([fakeExams, 1])

    const result = await callFindAll()

    expect(result).toBeInstanceOf(PaginatedResult)
    expect(result.data).toEqual(fakeExams)
    expect(result.meta.total).toBe(1)

    // Verify $transaction was called with a findMany and count
    const txArgs = prisma.$transaction.mock.calls[0][0]
    expect(txArgs).toHaveLength(2) // [findMany promise, count promise]

    // getTeacherScope was called for the effective teacher
    expect(teacherScope.getScope).toHaveBeenCalledWith(TEACHER_ID, SCHOOL_ID)
  })

  // ─── Scenario 2: Regular teacher with subjectIds, no classTeacherOfId ─
  it('regular teacher filters by assigned classes and subjects', async () => {
    teacherScope.getScope.mockResolvedValue({
      classIds: [CLASS_A],
      sectionIds: [SECTION_1],
      subjectIds: [SUBJECT_X],
      classTeacherOfId: null,
    })

    prisma.$transaction.mockResolvedValue([[], 0])

    const result = await callFindAll()

    expect(result).toBeInstanceOf(PaginatedResult)
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
    expect(teacherScope.getScope).toHaveBeenCalledWith(TEACHER_ID, SCHOOL_ID)
  })

  // ─── Scenario 3: Teacher with no subjectIds → classId-only filtering ─
  it('teacher with no subjectIds filters by classId only', async () => {
    teacherScope.getScope.mockResolvedValue({
      classIds: [CLASS_A],
      sectionIds: [],
      subjectIds: [],
      classTeacherOfId: null,
    })

    prisma.$transaction.mockResolvedValue([[], 0])

    const result = await callFindAll()

    expect(result).toBeInstanceOf(PaginatedResult)
    expect(result.data).toEqual([])
    expect(teacherScope.getScope).toHaveBeenCalledWith(TEACHER_ID, SCHOOL_ID)
  })

  // ─── Scenario 4: Empty classIds → early return ──────────────────────
  it('returns empty when teacher has no assigned classes', async () => {
    teacherScope.getScope.mockResolvedValue({
      classIds: [],
      sectionIds: [],
      subjectIds: [],
      classTeacherOfId: null,
    })

    const result = await callFindAll()

    expect(result).toBeInstanceOf(PaginatedResult)
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
    expect(result.meta.page).toBe(1)
    expect(result.meta.pageSize).toBe(20)
    // Should NOT reach $transaction since we return early
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  // ─── Scenario 5: Class teacher OR collapses to empty → early return ─
  it('returns empty when class teacher OR branch produces no valid conditions', async () => {
    // classTeacherOfId is set but classIds only contains that class,
    // and a classId filter excludes it
    teacherScope.getScope.mockResolvedValue({
      classIds: [CLASS_A],
      sectionIds: [],
      subjectIds: [SUBJECT_X],
      classTeacherOfId: CLASS_A,
    })

    // Querying with classId filter that won't match scope
    const result = await callFindAll({ classId: 'non-existent-class' })

    expect(result).toBeInstanceOf(PaginatedResult)
    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
  })
})
