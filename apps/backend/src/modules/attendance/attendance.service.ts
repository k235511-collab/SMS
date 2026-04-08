import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginatedResult } from '../../common/dto'
import { TeacherScopeService } from '../teachers/teacher-scope.service'
import { MarkAttendanceDto, AttendanceQueryDto } from './dto'

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teacherScopeService: TeacherScopeService,
  ) { }

  // ─── Helper: resolve teacher's allowed sectionIds ───────────────
  private async getTeacherScope(teacherId: string, schoolId: string) {
    return this.teacherScopeService.getScope(teacherId, schoolId)
  }

  private async validateTeacherAttendanceReadAccess(
    teacherId: string,
    schoolId: string,
    sectionId: string,
  ) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, schoolId },
      select: { id: true, classId: true },
    })

    if (!section) {
      throw new NotFoundException(`Section with ID "${sectionId}" not found`)
    }

    await this.teacherScopeService.validateClassTeacherAccess(
      teacherId,
      schoolId,
      section.classId,
      sectionId,
    )

    return section
  }

  async markAttendance(schoolId: string, dto: MarkAttendanceDto, teacherId?: string | null) {
    // Teacher validation: only class teachers can mark attendance
    if (teacherId) {
      if (!dto.sectionId) {
        throw new ForbiddenException('Teachers must specify a sectionId when marking attendance')
      }
      // Must be class teacher of the target class
      if (!dto.classId) {
        throw new ForbiddenException('Teachers must specify a classId when marking attendance')
      }

      const section = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, schoolId },
        select: { id: true, classId: true },
      })

      if (!section) {
        throw new NotFoundException(`Section with ID "${dto.sectionId}" not found`)
      }

      if (section.classId !== dto.classId) {
        throw new ForbiddenException('Selected class does not match the section')
      }

      await this.teacherScopeService.validateClassTeacherAccess(
        teacherId,
        schoolId,
        dto.classId,
        dto.sectionId,
      )
    }
    const results = await this.prisma.$transaction(
      dto.records.map((record) => {
        if ((record.status as string) === 'UNMARKED') {
          return this.prisma.attendance.deleteMany({
            where: {
              studentId: record.studentId,
              date: new Date(dto.date),
              schoolId,
            },
          })
        }
        return this.prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: record.studentId,
              date: new Date(dto.date),
            },
          },
          create: {
            date: new Date(dto.date),
            status: record.status as any,
            remarks: record.remarks,
            studentId: record.studentId,
            sectionId: dto.sectionId,
            schoolId,
          },
          update: {
            status: record.status as any,
            remarks: record.remarks,
            sectionId: dto.sectionId,
          },
        })
      }),
    )

    return { marked: results.length, date: dto.date }
  }

  async findAll(schoolId: string, query: AttendanceQueryDto, campusId?: string, teacherId?: string | null): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.section = { class: { campusId } }

    // Teacher scope: only show attendance for assigned sections/classes
    if (teacherId) {
      const scope = await this.getTeacherScope(teacherId, schoolId)
      const allowedSectionIds = scope.classTeacherSectionIds

      if (allowedSectionIds.length === 0) {
        return new PaginatedResult([], 0, query.page ?? 1, query.pageSize ?? 20)
      }

      where.sectionId = { in: allowedSectionIds }

      if (query.sectionId) {
        if (!allowedSectionIds.includes(query.sectionId)) {
          return new PaginatedResult([], 0, query.page ?? 1, query.pageSize ?? 20)
        }
        where.sectionId = query.sectionId
      }
    } else {
      if (query.sectionId) where.sectionId = query.sectionId
    }

    if (query.studentId) where.studentId = query.studentId

    if (query.startDate || query.endDate) {
      where.date = {}
      if (query.startDate) where.date.gte = new Date(query.startDate)
      if (query.endDate) {
        const end = new Date(query.endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        include: {
          student: { select: { id: true, rollNumber: true, firstName: true, lastName: true } },
          section: { select: { id: true, name: true, class: { select: { name: true } } } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { date: 'desc' },
      }),
      this.prisma.attendance.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findByStudent(studentId: string, schoolId: string, startDate?: string, endDate?: string, teacherId?: string | null) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    })

    if (!student) {
      throw new NotFoundException(`Student with ID "${studentId}" not found`)
    }

    // Teacher scope: can only view students in their assigned sections/classes
    if (teacherId) {
      const scope = await this.getTeacherScope(teacherId, schoolId)
      if (!student.sectionId || !scope.classTeacherSectionIds.includes(student.sectionId)) {
        throw new ForbiddenException('Only the class teacher can view attendance for this student')
      }
    }

    const where: any = { studentId, schoolId }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        section: { select: { id: true, name: true, class: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    })
  }

  async getReport(schoolId: string, sectionId: string, startDate: string, endDate: string, teacherId?: string | null) {
    // Teacher scope: can only view reports for assigned sections
    if (teacherId) {
      await this.validateTeacherAttendanceReadAccess(teacherId, schoolId, sectionId)
    }

    const [students, attendances] = await Promise.all([
      this.prisma.student.findMany({
        where: { sectionId, schoolId, status: 'ACTIVE', deletedAt: null },
        select: { id: true, rollNumber: true, firstName: true, lastName: true },
        orderBy: { rollNumber: 'asc' },
      }),
      this.prisma.attendance.findMany({
        where: {
          schoolId,
          sectionId,
          date: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { date: 'asc' },
      }),
    ])

    // Group by student
    const report = students.map((student) => {
      const studentAttendances = attendances.filter((a) => a.studentId === student.id)
      const summary = { present: 0, absent: 0, late: 0, excused: 0, halfDay: 0, total: studentAttendances.length }

      studentAttendances.forEach((att) => {
        switch (att.status) {
          case 'PRESENT': summary.present++; break
          case 'ABSENT': summary.absent++; break
          case 'LATE': summary.late++; break
          case 'EXCUSED': summary.excused++; break
          case 'HALF_DAY': summary.halfDay++; break
        }
      })

      return {
        student,
        records: studentAttendances.map((att) => ({
          date: att.date,
          status: att.status,
          remarks: att.remarks,
        })),
        summary,
      }
    })

    return report
  }

  /**
   * Get active students for a section — used by attendance page.
   * Requires READ_ATTENDANCE permission, NOT READ_STUDENT.
   */
  async getSectionStudents(schoolId: string, sectionId: string, teacherId?: string | null) {
    // Teacher scope: can only view students in assigned sections
    if (teacherId) {
      await this.validateTeacherAttendanceReadAccess(teacherId, schoolId, sectionId)
    }

    return this.prisma.student.findMany({
      where: { sectionId, schoolId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, rollNumber: true, firstName: true, lastName: true },
      orderBy: { rollNumber: 'asc' },
    })
  }
}
