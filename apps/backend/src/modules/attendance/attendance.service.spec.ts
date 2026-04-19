import { ForbiddenException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AttendanceService } from './attendance.service'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'
import { WhatsappService } from '../communications/whatsapp.service'

describe('AttendanceService', () => {
  let service: AttendanceService
  let prisma: {
    section: { findFirst: jest.Mock; findMany: jest.Mock }
    student: { findMany: jest.Mock; findFirst: jest.Mock }
    attendance: { findMany: jest.Mock; count: jest.Mock }
    $transaction: jest.Mock
  }
  let teacherScopeService: {
    getScope: jest.Mock
    validateClassTeacherAccess: jest.Mock
  }
  let whatsappService: {
    processAbsentTriggers: jest.Mock
  }

  beforeEach(async () => {
    prisma = {
      section: { findFirst: jest.fn(), findMany: jest.fn() },
      student: { findMany: jest.fn(), findFirst: jest.fn() },
      attendance: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn(),
    }

    teacherScopeService = {
      getScope: jest.fn(),
      validateClassTeacherAccess: jest.fn(),
    }

    whatsappService = {
      processAbsentTriggers: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherScopeService, useValue: teacherScopeService },
        { provide: WhatsappService, useValue: whatsappService },
      ],
    }).compile()

    service = module.get(AttendanceService)
  })

  it('returns no attendance rows for a subject teacher without class-teacher access', async () => {
    teacherScopeService.getScope.mockResolvedValue({
      classIds: ['class-a'],
      sectionIds: ['section-a'],
      subjectIds: ['subject-a'],
      classTeacherOfId: null,
      classTeacherClassIds: [],
      classTeacherSectionIds: [],
    })

    const result = await service.findAll(
      'school-1',
      { page: 1, pageSize: 20 } as any,
      undefined,
      'teacher-1',
    )

    expect(result.data).toEqual([])
    expect(result.meta.total).toBe(0)
  })

  it('requires class-teacher validation before returning section students', async () => {
    prisma.section.findFirst.mockResolvedValue({ id: 'section-1', classId: 'class-a' })
    prisma.student.findMany.mockResolvedValue([])

    await service.getSectionStudents('school-1', 'section-1', 'teacher-1')

    expect(teacherScopeService.validateClassTeacherAccess).toHaveBeenCalledWith(
      'teacher-1',
      'school-1',
      'class-a',
      'section-1',
    )
  })

  it('rejects attendance history for students outside the teacher class-teacher assignment', async () => {
    prisma.student.findFirst.mockResolvedValue({
      id: 'student-1',
      classId: 'class-a',
      sectionId: 'section-a',
    })
    teacherScopeService.getScope.mockResolvedValue({
      classIds: ['class-a'],
      sectionIds: ['section-a'],
      subjectIds: ['subject-a'],
      classTeacherOfId: 'class-b',
      classTeacherClassIds: ['class-b'],
      classTeacherSectionIds: ['section-b'],
    })

    await expect(
      service.findByStudent('student-1', 'school-1', undefined, undefined, 'teacher-1'),
    ).rejects.toThrow(ForbiddenException)
  })
})
