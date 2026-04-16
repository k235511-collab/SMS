import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { StudentStatus } from '@prisma/client'
import { TeacherScopeService } from '../teachers/teacher-scope.service'
import {
  CreateExamDto,
  UpdateExamDto,
  UpdateExamStatusDto,
  AssignTeacherDto,
  RecordResultDto,
  BulkRecordResultDto,
  GetExamsDto,
  GetExamStudentResultsDto,
  UpsertExamPaperDto,
} from './dto'

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScope: TeacherScopeService,
  ) { }

  private async resolveEffectiveTeacherId(
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ): Promise<string | null> {
    if (teacherId) {
      return teacherId
    }
    if (!requesterUserId) {
      return null
    }

    const teacher = await this.prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: requesterUserId,
        isActive: true,
      },
      select: { id: true },
    })

    return teacher?.id ?? null
  }

  // ─── Helper: resolve teacher's allowed classIds/sectionIds/subjectIds ───
  private async getTeacherScope(teacherId: string, schoolId: string) {
    return this.teacherScope.getScope(teacherId, schoolId)
  }

  // ═══════════════════════════════════════════════════════════════
  // EXAMS
  // ═══════════════════════════════════════════════════════════════

  async createExam(
    schoolId: string,
    dto: CreateExamDto,
    campusId?: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    // Verify class, section, and subject exist and belong to school
    const [classEntity, section, subject, academicYear] = await Promise.all([
      this.prisma.class.findFirst({ where: { id: dto.classId, schoolId } }),
      this.prisma.section.findFirst({ where: { id: dto.sectionId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: dto.subjectId, schoolId } }),
      this.prisma.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId } }),
    ])

    if (!classEntity) throw new NotFoundException('Class not found')
    if (!section) throw new NotFoundException('Section not found')
    if (!subject) throw new NotFoundException('Subject not found')
    if (!academicYear) throw new NotFoundException('Academic year not found')

    // Teacher scope check: teacher can only create exam for their assigned class/section/subject
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: dto.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        academicYearId: dto.academicYearId,
      })
    }

    const exam = await this.prisma.exam.create({
      data: {
        name: dto.name,
        type: dto.type,
        classId: dto.classId,
        sectionId: dto.sectionId,
        subjectId: dto.subjectId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        duration: dto.duration,
        totalMarks: dto.totalMarks ?? 100,
        passingMarks: dto.passingMarks ?? 33,
        weightage: dto.weightage,
        syllabus: dto.syllabus,
        status: dto.status,
        academicYearId: dto.academicYearId,
        schoolId,
        campusId: campusId || classEntity.campusId || undefined,
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
    })

    // If teacher is provided, assign them as invigilator
    if (dto.teacherId) {
      await this.prisma.examTeacher.create({
        data: {
          examId: exam.id,
          teacherId: dto.teacherId,
          role: 'INVIGILATOR',
          schoolId,
        },
      })
    }

    return exam
  }

  async findAllExams(
    schoolId: string,
    query: GetExamsDto,
    campusId?: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    if (query.startDate && query.endDate) {
      where.startDate = { gte: new Date(query.startDate) }
      where.endDate = { lte: new Date(query.endDate) }
    } else if (query.startDate) {
      where.startDate = { gte: new Date(query.startDate) }
    } else if (query.endDate) {
      where.endDate = { lte: new Date(query.endDate) }
    }

    // Campus filter: direct campusId on exam
    if (campusId) {
      where.campusId = campusId
    }

    // Teacher scope: only show exams for assigned classes
    if (effectiveTeacherId) {
      const accessConditions = await this.teacherScope.getExamAccessConditions(
        effectiveTeacherId,
        schoolId,
        query.academicYearId,
      )
      if (accessConditions.length === 0) {
        // No assigned classes → return empty
        return new PaginatedResult([], 0, query.page ?? 1, query.pageSize ?? 20)
      }
      where.AND = [...(where.AND || []), { OR: accessConditions }]
    } else {
      // Admin: apply explicit filters if provided
      if (query.classId) {
        where.classId = query.classId
      }
    }

    if (query.classId) {
      where.classId = query.classId
    }

    if (query.subjectId) {
      where.subjectId = query.subjectId
    }

    if (query.academicYearId) {
      where.academicYearId = query.academicYearId
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        include: {
          _count: { select: { examResults: true, examTeachers: true } },
          class: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
          academicYear: { select: { id: true, name: true, isCurrent: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findExamById(
    id: string,
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, schoolId },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        examTeachers: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          },
        },
        examResults: {
          include: {
            student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    if (!exam) {
      throw new NotFoundException(`Exam with ID "${id}" not found`)
    }

    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: exam.classId,
        sectionId: exam.sectionId,
        subjectId: exam.subjectId,
        academicYearId: exam.academicYearId ?? undefined,
      })
    }

    return exam
  }

  async updateExam(
    id: string,
    schoolId: string,
    dto: UpdateExamDto,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const exam = await this.findExamById(id, schoolId, effectiveTeacherId)

    // Teacher scope: can only update exams for their assigned classes
    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: (exam as any).classId,
        sectionId: (exam as any).sectionId,
        subjectId: (exam as any).subjectId,
        academicYearId: (exam as any).academicYearId ?? undefined,
      })
    }

    if (dto.academicYearId) {
      const year = await this.prisma.academicYear.findFirst({ where: { id: dto.academicYearId, schoolId } })
      if (!year) throw new NotFoundException('Academic year not found')
    }

    const { teacherId: dtoTeacherId, ...rest } = dto
    const data: any = { ...rest }
    if (dto.startDate) data.startDate = new Date(dto.startDate)
    if (dto.endDate) data.endDate = new Date(dto.endDate)

    // Update teacher assignment if provided
    if (dtoTeacherId) {
      // For simplicity, we'll replace existing assignments or add this one if it's the main invigilator
      // Check if this teacher is already assigned
      const existingAssignment = await this.prisma.examTeacher.findFirst({
        where: { examId: id, teacherId: dtoTeacherId, schoolId },
      })

      if (!existingAssignment) {
        // Remove other invigilators if we want to strictly follow the single-teacher UI pattern
        // Or just add this one. The UI suggests a single teacher select.
        await this.prisma.examTeacher.deleteMany({ where: { examId: id, role: 'INVIGILATOR', schoolId } })
        await this.prisma.examTeacher.create({
          data: {
            examId: id,
            teacherId: dtoTeacherId,
            role: 'INVIGILATOR',
            schoolId,
          },
        })
      }
    }

    return this.prisma.exam.update({
      where: { id },
      data,
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, code: true } },
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
    })
  }

  async updateExamStatus(
    id: string,
    schoolId: string,
    dto: UpdateExamStatusDto,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const exam = await this.findExamById(id, schoolId, effectiveTeacherId)

    // Teacher scope: can only change status of exams for their assigned classes
    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: (exam as any).classId,
        sectionId: (exam as any).sectionId,
        subjectId: (exam as any).subjectId,
        academicYearId: (exam as any).academicYearId ?? undefined,
      })
    }

    return this.prisma.exam.update({
      where: { id },
      data: { status: dto.status },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // TEACHER ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════


  async deleteExam(
    id: string,
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const exam = await this.findExamById(id, schoolId, effectiveTeacherId)

    // Teacher scope: can only delete exams for their assigned classes
    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: (exam as any).classId,
        sectionId: (exam as any).sectionId,
        subjectId: (exam as any).subjectId,
      })
    }

    // Delete related records first
    await this.prisma.$transaction([
      this.prisma.examResult.deleteMany({ where: { examId: id, schoolId } }),
      this.prisma.examTeacher.deleteMany({ where: { examId: id } }),
      this.prisma.exam.delete({ where: { id } }),
    ])

    return { success: true }
  } async assignTeacher(examId: string, schoolId: string, dto: AssignTeacherDto) {
    await this.findExamById(examId, schoolId)

    // Verify teacher exists
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: dto.teacherId, schoolId },
    })
    if (!teacher) throw new NotFoundException('Teacher not found')

    return this.prisma.examTeacher.create({
      data: {
        examId,
        teacherId: dto.teacherId,
        role: dto.role || 'INVIGILATOR',
        schoolId,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    })
  }

  async removeTeacher(examId: string, teacherId: string, schoolId: string) {
    await this.findExamById(examId, schoolId)

    return this.prisma.examTeacher.deleteMany({
      where: { examId, teacherId, schoolId },
    })
  }

  async getExamTeachers(examId: string, schoolId: string) {
    await this.findExamById(examId, schoolId)

    return this.prisma.examTeacher.findMany({
      where: { examId, schoolId },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      },
    })
  }

  async getExamsByTeacher(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    })
    if (!teacher) throw new NotFoundException('Teacher not found')

    return this.prisma.exam.findMany({
      where: {
        schoolId,
        examTeachers: { some: { teacherId } },
      },
      include: {
        class: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        _count: { select: { examResults: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // STUDENTS & RESULTS
  // ═══════════════════════════════════════════════════════════════

  async getExamStudents(
    examId: string,
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const exam = await this.findExamById(examId, schoolId, effectiveTeacherId)

    const students = exam.academicYearId
      ? await this.prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: exam.academicYearId,
          classId: exam.classId,
          sectionId: exam.sectionId,
          status: StudentStatus.ACTIVE,
          student: { deletedAt: null },
        },
        select: {
          student: {
            select: {
              id: true,
              rollNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { student: { rollNumber: 'asc' } },
      }).then((rows) => rows.map((row) => row.student))
      : await this.prisma.student.findMany({
        where: {
          classId: exam.classId,
          sectionId: exam.sectionId,
          schoolId,
          deletedAt: null,
        },
        select: {
          id: true,
          rollNumber: true,
          firstName: true,
          lastName: true,
        },
        orderBy: { rollNumber: 'asc' },
      })

    // Get existing results for these students
    const results = await this.prisma.examResult.findMany({
      where: {
        examId,
        studentId: { in: students.map(s => s.id) },
      },
    })

    // Map results to students
    const resultsMap = new Map(results.map(r => [r.studentId, r]))

    return students.map(student => ({
      ...student,
      result: resultsMap.get(student.id) || null,
      hasResult: resultsMap.has(student.id),
    }))
  }

  async getExamStudentResultsList(
    schoolId: string,
    query: GetExamStudentResultsDto,
    campusId?: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ): Promise<PaginatedResult<any>> {
    const effectiveAcademicYearId = query.academicYearId
      ?? (await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true },
      }))?.id

    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const examWhere: any = { schoolId }
    if (campusId) examWhere.campusId = campusId
    if (query.examId) examWhere.id = query.examId
    if (query.classId) examWhere.classId = query.classId
    if (query.subjectId) examWhere.subjectId = query.subjectId
    if (query.sectionId) examWhere.sectionId = query.sectionId
    if (effectiveAcademicYearId) examWhere.academicYearId = effectiveAcademicYearId

    const search = query.search?.trim()

    const enrollmentWhere: any = {
      schoolId,
      status: StudentStatus.ACTIVE,
      student: {
        deletedAt: null,
      },
    }

    if (effectiveTeacherId) {
      const accessConditions = await this.teacherScope.getExamAccessConditions(
        effectiveTeacherId,
        schoolId,
        effectiveAcademicYearId,
      )
      if (accessConditions.length === 0) {
        return new PaginatedResult([], 0, query.page ?? 1, query.pageSize ?? 20)
      }
      examWhere.AND = [...(examWhere.AND || []), { OR: accessConditions }]

      const scopedConditions = accessConditions.filter((condition) => typeof condition.classId === 'string')
      const scopedClassIds = [...new Set(scopedConditions.map((condition: any) => condition.classId))]
      const scopedSectionIds = [...new Set(scopedConditions.map((condition: any) => condition.sectionId).filter(Boolean))]

      enrollmentWhere.classId = { in: scopedClassIds }
      if (scopedSectionIds.length > 0) {
        enrollmentWhere.sectionId = { in: scopedSectionIds }
      }
    }

    if (campusId) {
      enrollmentWhere.class = { campusId }
    }

    if (query.classId) enrollmentWhere.classId = query.classId
    if (query.sectionId) enrollmentWhere.sectionId = query.sectionId
    if (effectiveAcademicYearId) enrollmentWhere.academicYearId = effectiveAcademicYearId

    if (search) {
      enrollmentWhere.student.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { rollNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [enrollments, total] = await this.prisma.$transaction([
      this.prisma.studentEnrollment.findMany({
        where: enrollmentWhere,
        skip: query.skip,
        take: query.take,
        select: {
          studentId: true,
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true } },
          student: {
            select: {
              id: true,
              rollNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { student: { rollNumber: 'asc' } },
      }),
      this.prisma.studentEnrollment.count({ where: enrollmentWhere }),
    ])

    const studentIds = enrollments.map((item) => item.studentId)
    const resultRows = studentIds.length
      ? await this.prisma.examResult.findMany({
        where: {
          schoolId,
          studentId: { in: studentIds },
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          exam: examWhere,
        },
        select: {
          id: true,
          studentId: true,
          marksObtained: true,
          percentage: true,
          grade: true,
          isAbsent: true,
          isPassed: true,
          subject: { select: { id: true, name: true } },
          exam: {
            select: {
              id: true,
              name: true,
              totalMarks: true,
              passingMarks: true,
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true } },
              academicYear: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      : []

    const resultByStudent = new Map<string, (typeof resultRows)>()
    for (const result of resultRows) {
      const list = resultByStudent.get(result.studentId)
      if (list) {
        list.push(result)
      } else {
        resultByStudent.set(result.studentId, [result])
      }
    }

    const rows = enrollments.flatMap((entry) => {
      const studentResults = resultByStudent.get(entry.studentId) || []

      if (!studentResults.length) {
        return [{
          exam: {
            id: `no-exam-${entry.studentId}`,
            name: '—',
            totalMarks: 0,
            passingMarks: 0,
            class: entry.class,
            section: entry.section || { id: '', name: '' },
            subject: { id: '', name: '' },
            academicYear: null,
          },
          student: entry.student,
          result: null as any,
        }]
      }

      return studentResults.map((result) => ({
        exam: {
          id: result.exam.id,
          name: result.exam.name,
          totalMarks: result.exam.totalMarks,
          passingMarks: result.exam.passingMarks,
          class: result.exam.class,
          section: result.exam.section,
          subject: result.exam.subject,
          academicYear: result.exam.academicYear,
        },
        student: entry.student,
        result: {
          id: result.id,
          marksObtained: result.marksObtained,
          percentage: result.percentage,
          grade: result.grade,
          isAbsent: result.isAbsent,
          isPassed: result.isPassed,
          subject: result.subject,
        },
      }))
    })

    return new PaginatedResult(rows, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async canUserEditResults(examId: string, userId: string, schoolId: string): Promise<boolean> {
    // Find teacher by userId
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, schoolId },
    })

    if (!teacher) return false

    // Check 1: teacher is assigned to this exam via ExamTeacher
    const assignment = await this.prisma.examTeacher.findFirst({
      where: { examId, teacherId: teacher.id, schoolId },
    })
    if (assignment) return true

    // Check 2: teacher is assigned to the exam's class/section/subject via TeacherClassAssignment
    const exam = await this.prisma.exam.findFirst({ where: { id: examId, schoolId } })
    if (!exam) return false

    try {
      await this.teacherScope.validateFullAccess(teacher.id, schoolId, {
        classId: exam.classId,
        sectionId: exam.sectionId,
        subjectId: exam.subjectId,
        academicYearId: exam.academicYearId ?? undefined,
      })
      return true
    } catch {
      // Check 3: teacher is class-teacher-of the exam's class (read access to all subjects)
      if (teacher.classTeacherOfId && teacher.classTeacherOfId === exam.classId) {
        return true
      }
      return false
    }
  }

  async getExamAnalytics(
    examId: string,
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    const exam = await this.findExamById(examId, schoolId, effectiveTeacherId)

    const results = await this.prisma.examResult.findMany({
      where: { examId, schoolId },
    })

    const totalStudents = results.length
    const passedStudents = results.filter(r => r.isPassed).length
    const failedStudents = totalStudents - passedStudents
    const absentStudents = results.filter(r => r.isAbsent).length

    const marks = results.filter(r => !r.isAbsent).map(r => r.marksObtained)
    const averageMarks = marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : 0
    const highestMarks = marks.length > 0 ? Math.max(...marks) : 0
    const lowestMarks = marks.length > 0 ? Math.min(...marks) : 0

    return {
      totalStudents,
      passedStudents,
      failedStudents,
      absentStudents,
      averageMarks,
      highestMarks,
      lowestMarks,
      passRate: totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RESULTS
  // ═══════════════════════════════════════════════════════════════

  async recordResult(
    schoolId: string,
    dto: RecordResultDto,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    // Verify exam belongs to school
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.examId, schoolId },
    })

    if (!exam) {
      throw new NotFoundException('Exam not found in this school')
    }

    // Teacher scope: validate access to exam's class/subject
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: exam.classId,
        sectionId: exam.sectionId,
        subjectId: dto.subjectId,
        academicYearId: exam.academicYearId ?? undefined,
      })
    }

    // Calculate percentage and pass status
    const isAbsent = dto.isAbsent ?? false
    const percentage = isAbsent ? null : (dto.marksObtained / exam.totalMarks) * 100
    const isPassed = isAbsent ? false : dto.marksObtained >= exam.passingMarks
    const grade = percentage !== null ? await this.getGradeForPercentage(schoolId, percentage) : dto.grade

    return this.prisma.examResult.upsert({
      where: {
        studentId_examId_subjectId: {
          studentId: dto.studentId,
          examId: dto.examId,
          subjectId: dto.subjectId,
        },
      },
      create: {
        studentId: dto.studentId,
        examId: dto.examId,
        subjectId: dto.subjectId,
        marksObtained: dto.marksObtained,
        grade: grade,
        remarks: dto.remarks,
        isAbsent,
        isPassed,
        percentage,
        schoolId,
      },
      update: {
        marksObtained: dto.marksObtained,
        grade: grade,
        remarks: dto.remarks,
        isAbsent,
        isPassed,
        percentage,
      },
      include: {
        student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
        exam: { select: { id: true, name: true, type: true } },
      },
    })
  }

  async bulkRecordResults(
    schoolId: string,
    dto: BulkRecordResultDto,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    // Verify exam belongs to school
    const exam = await this.prisma.exam.findFirst({
      where: { id: dto.examId, schoolId },
    })

    if (!exam) {
      throw new NotFoundException('Exam not found in this school')
    }

    // Teacher scope: validate access to exam's class/subject
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (effectiveTeacherId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: exam.classId,
        sectionId: exam.sectionId,
        subjectId: dto.subjectId,
        academicYearId: exam.academicYearId ?? undefined,
      })
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const upserted = []
      for (const entry of dto.results) {
        // Calculate percentage and pass status
        const isAbsent = entry.isAbsent ?? false
        const percentage = isAbsent ? null : (entry.marksObtained / exam.totalMarks) * 100
        const isPassed = isAbsent ? false : entry.marksObtained >= exam.passingMarks
        const grade = percentage !== null ? await this.getGradeForPercentage(schoolId, percentage) : entry.grade

        const result = await tx.examResult.upsert({
          where: {
            studentId_examId_subjectId: {
              studentId: entry.studentId,
              examId: dto.examId,
              subjectId: dto.subjectId,
            },
          },
          create: {
            studentId: entry.studentId,
            examId: dto.examId,
            subjectId: dto.subjectId,
            marksObtained: entry.marksObtained,
            grade: grade,
            remarks: entry.remarks,
            isAbsent,
            isPassed,
            percentage,
            schoolId,
          },
          update: {
            marksObtained: entry.marksObtained,
            grade: grade,
            remarks: entry.remarks,
            isAbsent,
            isPassed,
            percentage,
          },
        })
        upserted.push(result)
      }
      return upserted
    })

    return { recorded: results.length }
  }

  async getResultsByExam(
    examId: string,
    schoolId: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)
    await this.findExamById(examId, schoolId, effectiveTeacherId)

    return this.prisma.examResult.findMany({
      where: { examId, schoolId },
      include: {
        student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { marksObtained: 'desc' }],
    })
  }

  async getStudentResults(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    classId?: string,
    sectionId?: string,
    campusId?: string,
    startDate?: string,
    endDate?: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    })

    if (!student) {
      throw new NotFoundException('Student not found in this school')
    }

    const effectiveTeacherId = await this.resolveEffectiveTeacherId(schoolId, teacherId, requesterUserId)

    if (effectiveTeacherId && student.classId) {
      await this.teacherScope.validateFullAccess(effectiveTeacherId, schoolId, {
        classId: student.classId,
        sectionId: student.sectionId ?? undefined,
      })
    }

    const effectiveAcademicYearId = academicYearId
      ?? (await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true },
      }))?.id

    const where: any = { studentId, schoolId }

    if (effectiveAcademicYearId || classId || sectionId || campusId || startDate || endDate) {
      where.exam = {}
      if (effectiveAcademicYearId) where.exam.academicYearId = effectiveAcademicYearId
      if (classId) where.exam.classId = classId
      if (sectionId) where.exam.sectionId = sectionId
      if (campusId) where.exam.campusId = campusId
      if (startDate) where.exam.startDate = { gte: new Date(startDate) }
      if (endDate) where.exam.endDate = { lte: new Date(endDate) }
    }

    return this.prisma.examResult.findMany({
      where,
      include: {
        exam: { select: { id: true, name: true, type: true, totalMarks: true, passingMarks: true, startDate: true, endDate: true, status: true } },
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { exam: { createdAt: 'desc' } },
    })
  }

  async getStudentResultsSummary(
    studentId: string,
    schoolId: string,
    academicYearId?: string,
    startDate?: string,
    endDate?: string,
    teacherId?: string | null,
    requesterUserId?: string | null,
  ) {
    const results = await this.getStudentResults(
      studentId,
      schoolId,
      academicYearId,
      undefined,
      undefined,
      undefined,
      startDate,
      endDate,
      teacherId,
      requesterUserId,
    )

    // Group results by exam
    const examGroups = results.reduce((acc, result) => {
      const examId = result.examId
      if (!acc[examId]) {
        acc[examId] = {
          exam: result.exam,
          results: [],
          totalMarks: 0,
          obtainedMarks: 0,
          totalSubjects: 0,
          passedSubjects: 0,
          failedSubjects: 0,
        }
      }
      acc[examId].results.push(result)
      acc[examId].totalSubjects++
      acc[examId].totalMarks += result.exam.totalMarks
      acc[examId].obtainedMarks += result.marksObtained
      if (result.isPassed) acc[examId].passedSubjects++
      if (result.isPassed === false) acc[examId].failedSubjects++
      return acc
    }, {} as Record<string, any>)

    // Calculate overall summary
    const totalExams = Object.keys(examGroups).length
    const totalSubjects = results.length
    const passedSubjects = results.filter(r => r.isPassed === true).length
    const failedSubjects = results.filter(r => r.isPassed === false).length
    const absentSubjects = results.filter(r => r.isAbsent === true).length
    const averagePercentage = results.length > 0
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.filter(r => !r.isAbsent).length
      : 0

    return {
      exams: Object.values(examGroups),
      summary: {
        totalExams,
        totalSubjects,
        passedSubjects,
        failedSubjects,
        absentSubjects,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
      },
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GRADING SCALES
  // ═══════════════════════════════════════════════════════════════



  async getGradingScales(schoolId: string) {
    return this.prisma.gradingScale.findMany({
      where: { schoolId },
      orderBy: [{ minPercent: 'desc' }],
    })
  }

  async createGradingScale(schoolId: string, data: { name: string; minPercent: number; maxPercent: number; gpa?: number }) {
    // Check for overlapping ranges
    const existing = await this.prisma.gradingScale.findFirst({
      where: {
        schoolId,
        OR: [
          {
            minPercent: { lte: data.maxPercent },
            maxPercent: { gte: data.minPercent },
          },
        ],
      },
    })

    if (existing) {
      throw new ForbiddenException('Grading scale range overlaps with existing scale')
    }

    return this.prisma.gradingScale.create({
      data: {
        name: data.name,
        minPercent: data.minPercent,
        maxPercent: data.maxPercent,
        gpa: data.gpa,
        schoolId,
      },
    })
  }

  async updateGradingScale(id: string, schoolId: string, data: Partial<{ name: string; minPercent: number; maxPercent: number; gpa?: number }>) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id, schoolId },
    })

    if (!scale) {
      throw new NotFoundException('Grading scale not found')
    }

    // Check for overlapping ranges if percentage range is being updated
    if (data.minPercent !== undefined || data.maxPercent !== undefined) {
      const minPct = data.minPercent ?? scale.minPercent
      const maxPct = data.maxPercent ?? scale.maxPercent

      const existing = await this.prisma.gradingScale.findFirst({
        where: {
          schoolId,
          id: { not: id },
          OR: [
            {
              minPercent: { lte: maxPct },
              maxPercent: { gte: minPct },
            },
          ],
        },
      })

      if (existing) {
        throw new ForbiddenException('Grading scale range overlaps with existing scale')
      }
    }

    return this.prisma.gradingScale.update({
      where: { id },
      data: {
        name: data.name,
        minPercent: data.minPercent,
        maxPercent: data.maxPercent,
        gpa: data.gpa,
      },
    })
  }

  async deleteGradingScale(id: string, schoolId: string) {
    const scale = await this.prisma.gradingScale.findFirst({
      where: { id, schoolId },
    })

    if (!scale) {
      throw new NotFoundException('Grading scale not found')
    }

    await this.prisma.gradingScale.delete({ where: { id } })
    return { success: true }
  }

  async getGradeForPercentage(schoolId: string, percentage: number): Promise<string | null> {
    const scale = await this.prisma.gradingScale.findFirst({
      where: {
        schoolId,
        minPercent: { lte: percentage },
        maxPercent: { gte: percentage },
      },
    })
    return scale?.name || null
  }

  // ═══════════════════════════════════════════════════════════════
  // EXAM PAPER BUILDER
  // ═══════════════════════════════════════════════════════════════

  async getExamPaper(examId: string, schoolId: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { examId, schoolId },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              include: {
                options: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    })
    return paper
  }

  async upsertExamPaper(examId: string, schoolId: string, dto: UpsertExamPaperDto) {
    // Verify exam belongs to school
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, schoolId },
    })
    if (!exam) {
      throw new NotFoundException('Exam not found')
    }

    return this.prisma.$transaction(async (tx) => {
      // Upsert the paper itself
      const paper = await tx.examPaper.upsert({
        where: { examId },
        create: {
          examId,
          schoolId,
          paperTitle: dto.paperTitle ?? '',
          schoolName: dto.schoolName ?? '',
          schoolLogo: dto.schoolLogo ?? '',
          headerInstructions: dto.headerInstructions ?? '',
          date: dto.date ?? '',
          totalMarks: dto.totalMarks ?? 100,
          duration: dto.duration ?? '2 hours',
          instructions: dto.instructions ?? '',
        },
        update: {
          paperTitle: dto.paperTitle,
          schoolName: dto.schoolName,
          schoolLogo: dto.schoolLogo,
          headerInstructions: dto.headerInstructions,
          date: dto.date,
          totalMarks: dto.totalMarks,
          duration: dto.duration,
          instructions: dto.instructions,
          version: { increment: 1 },
        },
      })

      // Delete old sections (cascade deletes questions + options)
      await tx.examSection.deleteMany({ where: { paperId: paper.id } })

      // Create fresh sections, questions, options
      for (const sec of dto.sections) {
        const section = await tx.examSection.create({
          data: {
            paperId: paper.id,
            schoolId,
            title: sec.title,
            type: sec.type,
            instructions: sec.instructions ?? '',
            totalMarks: sec.totalMarks,
            sortOrder: sec.sortOrder,
          },
        })

        for (const q of sec.questions) {
          const question = await tx.examQuestion.create({
            data: {
              sectionId: section.id,
              schoolId,
              questionText: q.questionText,
              questionType: q.questionType,
              marks: q.marks,
              sortOrder: q.sortOrder,
              imageBase64: q.imageBase64 ?? null,
            },
          })

          if (q.options.length > 0) {
            await tx.questionOption.createMany({
              data: q.options.map((opt) => ({
                questionId: question.id,
                optionText: opt.optionText,
                isCorrect: opt.isCorrect,
                sortOrder: opt.sortOrder,
              })),
            })
          }
        }
      }

      // Return full paper
      return tx.examPaper.findUnique({
        where: { id: paper.id },
        include: {
          sections: {
            orderBy: { sortOrder: 'asc' },
            include: {
              questions: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  options: { orderBy: { sortOrder: 'asc' } },
                },
              },
            },
          },
        },
      })
    })
  }

  async deleteExamPaper(examId: string, schoolId: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { examId, schoolId },
    })
    if (!paper) {
      throw new NotFoundException('Exam paper not found')
    }
    await this.prisma.examPaper.delete({ where: { id: paper.id } })
    return { success: true }
  }
}
