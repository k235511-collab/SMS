import { Injectable, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Teacher Class Scope — Shared service for resolving a teacher's
 * assigned classIds, sectionIds, and subjectIds.
 *
 * Injected by exams, attendance, assignments, and any future service
 * that needs to scope data access to a teacher's assignments.
 */

export interface TeacherScope {
  classIds: string[]
  sectionIds: string[]
  subjectIds: string[]
  /** The classId this teacher is "class teacher of" — grants read access to all subjects */
  classTeacherOfId: string | null
}

interface ActiveTeacherAssignment {
  classId: string
  sectionId: string | null
  subjectId: string | null
  academicYearId: string | null
}

@Injectable()
export class TeacherScopeService {
  constructor(private readonly prisma: PrismaService) {}

  private buildAcademicYearWhere(academicYearId?: string) {
    if (!academicYearId) {
      return {}
    }

    return {
      OR: [
        { academicYearId },
        { academicYearId: null },
      ],
    }
  }

  private async getResolvedAssignments(
    teacherId: string,
    schoolId: string,
    academicYearId?: string,
  ): Promise<{ assignments: ActiveTeacherAssignment[]; classTeacherOfId: string | null }> {
    const [assignments, teacher] = await Promise.all([
      this.prisma.teacherClassAssignment.findMany({
        where: {
          teacherId,
          schoolId,
          isActive: true,
          ...this.buildAcademicYearWhere(academicYearId),
        },
        select: {
          classId: true,
          sectionId: true,
          subjectId: true,
          academicYearId: true,
        },
      }),
      this.prisma.teacher.findFirst({
        where: { id: teacherId, schoolId },
        select: { classTeacherOfId: true },
      }),
    ])

    return {
      assignments,
      classTeacherOfId: teacher?.classTeacherOfId ?? null,
    }
  }

  async getExamAccessConditions(
    teacherId: string,
    schoolId: string,
    academicYearId?: string,
  ): Promise<Array<Record<string, unknown>>> {
    const { assignments, classTeacherOfId } = await this.getResolvedAssignments(teacherId, schoolId, academicYearId)
    const conditions: Array<Record<string, unknown>> = []

    if (classTeacherOfId) {
      conditions.push({ classId: classTeacherOfId })
    }

    for (const assignment of assignments) {
      const condition: Record<string, unknown> = { classId: assignment.classId }
      if (assignment.sectionId) {
        condition.sectionId = assignment.sectionId
      }
      if (assignment.subjectId) {
        condition.subjectId = assignment.subjectId
      }
      conditions.push(condition)
    }

    const seen = new Set<string>()
    return conditions.filter((condition) => {
      const key = JSON.stringify(condition)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  /**
   * Resolve all classIds, sectionIds, and subjectIds assigned to a teacher.
   * Only returns active assignments.
   *
   * Edge case: if a teacher has a class assignment WITHOUT a section,
   * we expand sectionIds to include ALL sections of that class so the
   * teacher is not blocked from accessing any section within the class.
   */
  async getScope(teacherId: string, schoolId: string, academicYearId?: string): Promise<TeacherScope> {
    const { assignments, classTeacherOfId } = await this.getResolvedAssignments(teacherId, schoolId, academicYearId)

    const classIds = [...new Set(assignments.map((a) => a.classId))]
    const explicitSectionIds = [
      ...new Set(
        assignments
          .map((a) => a.sectionId)
          .filter((id): id is string => id !== null),
      ),
    ]
    const subjectIds = [
      ...new Set(
        assignments
          .map((a) => a.subjectId)
          .filter((id): id is string => id !== null),
      ),
    ]

    // Class teacher's class is always included in classIds for read access
    if (classTeacherOfId && !classIds.includes(classTeacherOfId)) {
      classIds.push(classTeacherOfId)
    }

    // ── Class-only assignment edge case ──────────────────────────
    // If teacher has a class assignment without a specific section,
    // expand to include ALL sections of that class.
    const classOnlyIds = assignments
      .filter((a) => a.sectionId === null)
      .map((a) => a.classId)
    // Also include classTeacherOfId as a "class-only" since they manage the whole class
    if (classTeacherOfId) classOnlyIds.push(classTeacherOfId)
    const uniqueClassOnlyIds = [...new Set(classOnlyIds)]

    let sectionIds = [...explicitSectionIds]

    if (uniqueClassOnlyIds.length > 0) {
      const expandedSections = await this.prisma.section.findMany({
        where: { classId: { in: uniqueClassOnlyIds }, schoolId },
        select: { id: true },
      })
      for (const s of expandedSections) {
        if (!sectionIds.includes(s.id)) sectionIds.push(s.id)
      }
    }

    return { classIds, sectionIds, subjectIds, classTeacherOfId }
  }

  /**
   * Validate that a teacher is assigned to the given class.
   * Throws ForbiddenException if not.
   */
  async validateClassAccess(teacherId: string, schoolId: string, classId: string): Promise<void> {
    const scope = await this.getScope(teacherId, schoolId)
    if (scope.classIds.length > 0 && !scope.classIds.includes(classId)) {
      throw new ForbiddenException('You are not assigned to this class')
    }
  }

  /**
   * Validate that a teacher is assigned to the given section.
   * Throws ForbiddenException if not.
   */
  async validateSectionAccess(teacherId: string, schoolId: string, sectionId: string): Promise<void> {
    const scope = await this.getScope(teacherId, schoolId)
    if (scope.sectionIds.length > 0 && !scope.sectionIds.includes(sectionId)) {
      throw new ForbiddenException('You are not assigned to this section')
    }
  }

  /**
   * Validate that a teacher is the class teacher for the given class.
   * Used to restrict attendance marking to class teachers only.
   */
  async validateClassTeacherAccess(teacherId: string, schoolId: string, classId: string): Promise<void> {
    const scope = await this.getScope(teacherId, schoolId)
    if (!scope.classTeacherOfId || scope.classTeacherOfId !== classId) {
      throw new ForbiddenException('Only class teachers can mark attendance for this class')
    }
  }

  /**
   * Validate that a teacher is assigned to the given subject.
   * Throws ForbiddenException if not.
   */
  async validateSubjectAccess(teacherId: string, schoolId: string, subjectId: string): Promise<void> {
    const scope = await this.getScope(teacherId, schoolId)
    if (scope.subjectIds.length > 0 && !scope.subjectIds.includes(subjectId)) {
      throw new ForbiddenException('You are not assigned to this subject')
    }
  }

  /**
   * Full validation: class + section + subject (each only checked if teacher has assignments).
   */
  async validateFullAccess(
    teacherId: string,
    schoolId: string,
    opts: { classId?: string; sectionId?: string; subjectId?: string; academicYearId?: string },
  ): Promise<void> {
    const { assignments, classTeacherOfId } = await this.getResolvedAssignments(
      teacherId,
      schoolId,
      opts.academicYearId,
    )

    const isClassTeacher = classTeacherOfId && opts.classId && classTeacherOfId === opts.classId
    if (isClassTeacher) {
      return
    }

    const hasMatch = assignments.some((assignment) => {
      if (opts.classId && assignment.classId !== opts.classId) {
        return false
      }

      if (opts.sectionId && assignment.sectionId && assignment.sectionId !== opts.sectionId) {
        return false
      }

      if (opts.subjectId && assignment.subjectId && assignment.subjectId !== opts.subjectId) {
        return false
      }

      return true
    })

    if (!hasMatch) {
      if (opts.subjectId) {
        throw new ForbiddenException('You are not assigned to this subject for the selected class/section')
      }
      if (opts.sectionId) {
        throw new ForbiddenException('You are not assigned to this section')
      }
      if (opts.classId) {
        throw new ForbiddenException('You are not assigned to this class')
      }
    }
  }
}
