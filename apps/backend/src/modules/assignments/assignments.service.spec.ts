import { ForbiddenException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AssignmentsService } from './assignments.service'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'

describe('AssignmentsService', () => {
  let service: AssignmentsService
  let prisma: {
    assignment: {
      findMany: jest.Mock
      count: jest.Mock
      findFirst: jest.Mock
    }
    $transaction: jest.Mock
  }
  let teacherScope: {
    getScope: jest.Mock
    getAssignmentAccessConditions: jest.Mock
    validateFullAccess: jest.Mock
  }

  beforeEach(async () => {
    prisma = {
      assignment: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    }

    teacherScope = {
      getScope: jest.fn(),
      getAssignmentAccessConditions: jest.fn(),
      validateFullAccess: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherScopeService, useValue: teacherScope },
      ],
    }).compile()

    service = module.get(AssignmentsService)
  })

  it('keeps teacher scope applied when a class filter is passed', async () => {
    teacherScope.getAssignmentAccessConditions.mockResolvedValue([
      { classId: 'class-a', subjectId: 'subject-a' },
    ])
    prisma.assignment.findMany.mockResolvedValue([])
    prisma.assignment.count.mockResolvedValue(0)
    prisma.$transaction.mockResolvedValue([[], 0])

    await service.findAll(
      'school-1',
      { classId: 'class-b', page: 1, pageSize: 20 },
      undefined,
      'teacher-1',
    )

    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
          AND: [
            { OR: [{ classId: 'class-a', subjectId: 'subject-a' }] },
            { classId: 'class-b' },
          ],
        }),
      }),
    )
    expect(prisma.assignment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-1',
        }),
      }),
    )
  })

  it('rejects teacher access to an assignment outside their scope', async () => {
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'assignment-1',
      classId: 'class-a',
      subjectId: 'subject-a',
      teacherId: 'teacher-2',
    })
    teacherScope.validateFullAccess.mockRejectedValue(
      new ForbiddenException('You are not assigned to this subject for the selected class/section'),
    )

    await expect(service.findById('assignment-1', 'school-1', 'teacher-1')).rejects.toThrow(
      ForbiddenException,
    )

    expect(teacherScope.validateFullAccess).toHaveBeenCalledWith('teacher-1', 'school-1', {
      classId: 'class-a',
      subjectId: 'subject-a',
    })
  })
})
