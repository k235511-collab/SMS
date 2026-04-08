import { ForbiddenException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { TimetableService } from './timetable.service'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'

describe('TimetableService', () => {
  let service: TimetableService
  let prisma: {
    timetableSlot: { findMany: jest.Mock }
    teacher: { findFirst: jest.Mock }
    periodTemplate: { findMany: jest.Mock }
  }
  let teacherScope: { validateSectionAccess: jest.Mock }

  beforeEach(async () => {
    prisma = {
      timetableSlot: { findMany: jest.fn() },
      teacher: { findFirst: jest.fn() },
      periodTemplate: { findMany: jest.fn() },
    }

    teacherScope = {
      validateSectionAccess: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherScopeService, useValue: teacherScope },
      ],
    }).compile()

    service = module.get(TimetableService)
  })

  it('validates teacher section access before returning a section timetable', async () => {
    prisma.timetableSlot.findMany.mockResolvedValue([])

    await service.findBySection('section-1', 'school-1', 'teacher-1')

    expect(teacherScope.validateSectionAccess).toHaveBeenCalledWith(
      'teacher-1',
      'school-1',
      'section-1',
    )
  })

  it('rejects teachers trying to read another teacher schedule', async () => {
    await expect(
      service.findByTeacher('teacher-2', 'school-1', 'teacher-1'),
    ).rejects.toThrow(ForbiddenException)
  })
})
