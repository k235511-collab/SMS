import { Test, TestingModule } from '@nestjs/testing'
import { SubmissionsService } from './submissions.service'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'

describe('SubmissionsService', () => {
  let service: SubmissionsService
  let prisma: {
    assignment: { findFirst: jest.Mock }
    submission: { findMany: jest.Mock }
  }
  let teacherScope: { validateFullAccess: jest.Mock }

  beforeEach(async () => {
    prisma = {
      assignment: { findFirst: jest.fn() },
      submission: { findMany: jest.fn() },
    }

    teacherScope = {
      validateFullAccess: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TeacherScopeService, useValue: teacherScope },
      ],
    }).compile()

    service = module.get(SubmissionsService)
  })

  it('validates teacher scope before returning submissions for an assignment', async () => {
    prisma.assignment.findFirst.mockResolvedValue({
      id: 'assignment-1',
      classId: 'class-a',
      subjectId: 'subject-a',
    })
    prisma.submission.findMany.mockResolvedValue([])

    await service.findByAssignment('assignment-1', 'school-1', 'teacher-1')

    expect(teacherScope.validateFullAccess).toHaveBeenCalledWith('teacher-1', 'school-1', {
      classId: 'class-a',
      subjectId: 'subject-a',
    })
    expect(prisma.submission.findMany).toHaveBeenCalledWith({
      where: { assignmentId: 'assignment-1', schoolId: 'school-1' },
      include: { student: true },
      orderBy: { submittedAt: 'desc' },
    })
  })
})
