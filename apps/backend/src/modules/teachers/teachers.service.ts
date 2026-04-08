import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateTeacherDto, UpdateTeacherDto, AssignClassDto, UpdateTeacherProfileDto } from './dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  private buildAssignmentAcademicYearFilter(academicYearId?: string) {
    if (!academicYearId) {
      return {}
    }

    return {
      OR: [{ academicYearId }, { academicYearId: null }],
    }
  }

  /**
   * Validate that a class doesn't already have another class teacher.
   * One class can only have ONE class teacher.
   */
  private async validateClassTeacherUniqueness(
    classId: string,
    schoolId: string,
    excludeTeacherId?: string,
  ): Promise<void> {
    const existing = await this.prisma.teacher.findFirst({
      where: {
        schoolId,
        classTeacherOfId: classId,
        isActive: true,
        ...(excludeTeacherId ? { id: { not: excludeTeacherId } } : {}),
      },
      select: { id: true, firstName: true, lastName: true },
    })
    if (existing) {
      throw new ConflictException(
        `This class already has a class teacher: ${existing.firstName} ${existing.lastName}. ` +
          `Please remove them as class teacher first.`,
      )
    }
  }

  async create(schoolId: string, dto: CreateTeacherDto, campusId?: string) {
    if (!campusId) {
      throw new BadRequestException('Campus is required to create a teacher')
    }

    // Check plan limit
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: { subscriptionPlan: true, _count: { select: { teachers: true } } },
    })
    if (school?.subscriptionPlan?.maxTeachers != null) {
      if (school._count.teachers >= school.subscriptionPlan.maxTeachers) {
        throw new BadRequestException(
          `Teacher limit reached (${school.subscriptionPlan.maxTeachers}). Upgrade your plan to add more teachers.`,
        )
      }
    }

    const existing = await this.prisma.teacher.findUnique({
      where: { employeeId_campusId: { employeeId: dto.employeeId, campusId } },
    })

    if (existing) {
      throw new ConflictException('Teacher with this employee ID already exists in this campus')
    }

    // Validate classTeacherOfId uniqueness
    if (dto.classTeacherOfId) {
      await this.validateClassTeacherUniqueness(dto.classTeacherOfId, schoolId)
    }

    // Auto-create User account if email+password provided
    let userId = dto.userId
    if (!userId && dto.email && dto.password) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email_schoolId: { email: dto.email, schoolId } },
      })
      if (existingUser) {
        throw new ConflictException('A user with this email already exists in this school')
      }

      // Determine role: use provided roleId or find default teacher role
      let roleId = dto.roleId
      if (!roleId) {
        let teacherRole = await this.prisma.role.findFirst({
          where: { slug: 'teacher', schoolId },
        })
        if (!teacherRole) {
          // Default role lookup is intentionally unscoped here because the tenant
          // extension may reject role discovery before creation completes.
          teacherRole = await this.prisma.unscopedClient.role.findFirst({
            where: { slug: 'teacher', schoolId },
          })
        }
        if (!teacherRole) {
          throw new NotFoundException(
            'Teacher role not found. Please create a "teacher" role first.',
          )
        }
        roleId = teacherRole.id
      }

      const passwordHash = await bcrypt.hash(dto.password, 10)
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          schoolId,
          roleId,
          campusId: campusId || undefined,
        },
      })
      userId = user.id
    }

    return this.prisma.teacher.create({
      data: {
        employeeId: dto.employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        qualification: dto.qualification,
        specialization: dto.specialization,
        joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        salary: dto.salary,
        cnic: dto.cnic,
        maritalStatus: dto.maritalStatus,
        fatherHusbandName: dto.fatherHusbandName,
        fatherHusbandCnic: dto.fatherHusbandCnic,
        qualificationAtAppt: dto.qualificationAtAppt,
        department: dto.department,
        experience: dto.experience,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        phone: dto.phone,
        bloodGroup: dto.bloodGroup,
        religion: dto.religion,
        designation: dto.designation,
        address: dto.address,
        note: dto.note,
        photo: dto.photo,
        schoolId,
        userId,
        campusId: campusId || undefined,
        classTeacherOfId: dto.classTeacherOfId || undefined,
      } as any,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
            role: { select: { name: true } },
          },
        },
        classTeacherOf: { select: { id: true, name: true } },
      },
    })
  }

  async findAll(
    schoolId: string,
    query: PaginationDto,
    campusId?: string,
  ): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId

    if (query.search) {
      where.OR = [
        { employeeId: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              roleId: true,
              role: { select: { name: true } },
            },
          },
          classTeacherOf: { select: { id: true, name: true } },
          classAssignments: {
            where: { isActive: true },
            select: {
              id: true,
              classId: true,
              sectionId: true,
              subjectId: true,
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
              subject: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.teacher.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findById(id: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
            role: { select: { name: true } },
          },
        },
        classTeacherOf: { select: { id: true, name: true } },
      },
    })

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${id}" not found`)
    }

    return teacher
  }

  async update(id: string, schoolId: string, dto: UpdateTeacherDto) {
    const teacher = await this.findById(id, schoolId)

    const data: any = { ...dto }

    // Handle date conversions
    if (dto.joinDate) data.joinDate = new Date(dto.joinDate)
    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth)

    // Handle user account update if email/password/roleId provided
    if (teacher.userId && (dto.email || dto.password || dto.roleId)) {
      const userData: any = {}
      if (dto.email) userData.email = dto.email
      if (dto.password) userData.passwordHash = await bcrypt.hash(dto.password, 10)
      if (dto.roleId) userData.roleId = dto.roleId
      await this.prisma.user.update({ where: { id: teacher.userId }, data: userData })
    }

    // Remove user-account-only fields before saving to teacher table
    delete data.email
    delete data.password
    delete data.roleId

    // Handle campus transfer
    if (dto.campusId !== undefined) {
      data.campusId = dto.campusId || null
      // Also update user's campusId if teacher has a linked user account
      if (teacher.userId) {
        await this.prisma.user.update({
          where: { id: teacher.userId },
          data: { campusId: dto.campusId || null },
        })
      }
    }

    // Handle classTeacherOfId — allow setting to null to unset
    if ('classTeacherOfId' in dto) {
      const newClassTeacherId = dto.classTeacherOfId || null
      const oldClassTeacherId = teacher.classTeacherOfId

      // Validate uniqueness: one class can only have one class teacher
      if (newClassTeacherId && newClassTeacherId !== oldClassTeacherId) {
        await this.validateClassTeacherUniqueness(newClassTeacherId, schoolId, id)
      }

      data.classTeacherOfId = newClassTeacherId

      // Sync class assignments when classTeacherOfId changes
      if (oldClassTeacherId && oldClassTeacherId !== newClassTeacherId) {
        // Deactivate assignments for the old class (class-teacher-level, i.e. sectionId/subjectId are null)
        await this.prisma.teacherClassAssignment.updateMany({
          where: { teacherId: id, schoolId, classId: oldClassTeacherId, isActive: true },
          data: { isActive: false },
        })
      }
      if (newClassTeacherId && newClassTeacherId !== oldClassTeacherId) {
        // Ensure an active assignment exists for the new class
        const existing = await this.prisma.teacherClassAssignment.findFirst({
          where: { teacherId: id, schoolId, classId: newClassTeacherId, isActive: true },
        })
        if (!existing) {
          await this.prisma.teacherClassAssignment.create({
            data: { teacherId: id, schoolId, classId: newClassTeacherId, isActive: true },
          })
        }
      }
    }

    return this.prisma.teacher.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            roleId: true,
            role: { select: { name: true } },
          },
        },
        classTeacherOf: { select: { id: true, name: true } },
      },
    })
  }

  /**
   * Delete a teacher. Historical Data Policy:
   * - ExamTeacher junction records remain (with dangling teacherId) — acceptable
   * - Assignments created by this teacher keep their teacherId (soft reference)
   * - Attendance records do not have teacherId so are unaffected
   * - Class assignments are cascade-deleted by Prisma default
   * For full audit trail, prefer soft-delete (set isActive=false) over hard delete.
   */
  async remove(id: string, schoolId: string) {
    await this.findById(id, schoolId)

    // Soft-deactivate all class assignments first (preserves history)
    await this.prisma.teacherClassAssignment.updateMany({
      where: { teacherId: id, schoolId },
      data: { isActive: false },
    })

    // Deactivate teacher rather than hard-delete
    return this.prisma.teacher.update({
      where: { id },
      data: { isActive: false },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // TEACHER SELF-SERVICE PROFILE
  // ═══════════════════════════════════════════════════════════════

  async getMyProfile(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: { select: { name: true, slug: true } },
          },
        },
        classTeacherOf: { select: { id: true, name: true } },
        campus: { select: { id: true, name: true } },
        classAssignments: {
          where: { isActive: true },
          include: {
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!teacher) throw new NotFoundException('Teacher profile not found')
    return teacher
  }

  /**
   * Self-service update: only allows safe personal/contact fields.
   * Prevents teachers from modifying salary, campus, role, etc.
   */
  async updateMyProfile(teacherId: string, schoolId: string, dto: UpdateTeacherProfileDto) {
    await this.getMyProfile(teacherId, schoolId)

    return this.prisma.teacher.update({
      where: { id: teacherId },
      data: {
        phone: dto.phone,
        address: dto.address,
        photo: dto.photo,
        note: dto.note,
        religion: dto.religion,
        bloodGroup: dto.bloodGroup,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        classTeacherOf: { select: { id: true, name: true } },
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // CLASS ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════

  async assignClass(teacherId: string, schoolId: string, dto: AssignClassDto) {
    await this.findById(teacherId, schoolId)

    // Verify class belongs to school
    const classEntity = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    })
    if (!classEntity) throw new NotFoundException('Class not found')

    // Verify section if provided
    if (dto.sectionId) {
      const section = await this.prisma.section.findFirst({
        where: { id: dto.sectionId, schoolId },
      })
      if (!section) throw new NotFoundException('Section not found')
    }

    // Find existing assignment (handles nullable fields unlike upsert with compound unique)
    const existing = await this.prisma.teacherClassAssignment.findFirst({
      where: {
        teacherId,
        classId: dto.classId,
        sectionId: dto.sectionId ?? null,
        academicYearId: dto.academicYearId ?? null,
      },
    })

    const include = {
      class: { select: { id: true, name: true, code: true } },
      section: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
      academicYear: { select: { id: true, name: true } },
    }

    if (existing) {
      // Re-activate or update existing assignment
      return this.prisma.teacherClassAssignment.update({
        where: { id: existing.id },
        data: {
          subjectId: dto.subjectId ?? null,
          isActive: dto.isActive ?? true,
        },
        include,
      })
    }

    return this.prisma.teacherClassAssignment.create({
      data: {
        teacherId,
        classId: dto.classId,
        sectionId: dto.sectionId ?? null,
        subjectId: dto.subjectId ?? null,
        academicYearId: dto.academicYearId ?? null,
        schoolId,
        isActive: dto.isActive ?? true,
      },
      include,
    })
  }

  async getClassAssignments(teacherId: string, schoolId: string, academicYearId?: string) {
    await this.findById(teacherId, schoolId)

    return this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherId,
        schoolId,
        isActive: true,
        ...this.buildAssignmentAcademicYearFilter(academicYearId),
      },
      include: {
        class: { select: { id: true, name: true, code: true } },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
      orderBy: [
        { class: { name: 'asc' } },
        { section: { name: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    })
  }

  async getMyClasses(teacherId: string, schoolId: string, academicYearId?: string) {
    return this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherId,
        schoolId,
        isActive: true,
        ...this.buildAssignmentAcademicYearFilter(academicYearId),
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            code: true,
            _count: { select: { students: true } },
          },
        },
        section: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true, isCurrent: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  /**
   * Remove a class assignment.
   *
   * Historical Data Policy: instead of hard-deleting, we soft-deactivate the
   * assignment so that historical data (exams, attendance, grades) linked to this
   * teacher + class continue to make sense. This also allows re-activating later.
   */
  async removeClassAssignment(assignmentId: string, teacherId: string, schoolId: string) {
    const assignment = await this.prisma.teacherClassAssignment.findFirst({
      where: { id: assignmentId, teacherId, schoolId },
    })
    if (!assignment) throw new NotFoundException('Assignment not found')

    // Soft-deactivate rather than hard-delete to preserve historical context
    return this.prisma.teacherClassAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    })
  }

  /**
   * Sync a teacher's teaching assignments for an academic year.
   *
   * Role rules:
   * - Class Teacher rows are stored as subjectId=null and sectionId is required.
   * - Subject Teacher rows are stored with subjectId set and sectionId optional.
   *   If sectionIds is empty for subject-teacher mode, the row applies to all
   *   sections in the class (sectionId=null).
   */
  async syncClasses(
    teacherId: string,
    schoolId: string,
    academicYearId: string | undefined,
    assignments: Array<{
      classId: string
      sectionIds?: string[]
      subjectIds?: string[]
      isClassTeacher?: boolean
      isSubjectTeacher?: boolean
      academicYearId?: string
    }>,
  ) {
    await this.findById(teacherId, schoolId)

    type DesiredRow = {
      classId: string
      sectionId: string | null
      subjectId: string | null
      academicYearId: string | null
    }

    // Build desired set of exact teaching rows.
    const desired: Array<{
      classId: string
      sectionId: string | null
      subjectId: string | null
      academicYearId: string | null
    }> = []

    for (const a of assignments) {
      const effectiveYearId = a.academicYearId ?? academicYearId ?? null
      const sectionIds = [...new Set((a.sectionIds || []).filter(Boolean))]
      const subjectIds = [...new Set((a.subjectIds || []).filter(Boolean))]
      const isClassTeacher = a.isClassTeacher === true
      const isSubjectTeacher = a.isSubjectTeacher === true || (a.isSubjectTeacher !== false && subjectIds.length > 0)

      if (!isClassTeacher && !isSubjectTeacher) {
        throw new BadRequestException('Each assignment must include at least one role')
      }

      if (isClassTeacher && sectionIds.length === 0) {
        throw new BadRequestException('Please select at least one section for each class-teacher assignment')
      }

      if (isSubjectTeacher && subjectIds.length === 0) {
        throw new BadRequestException('Each subject-teacher assignment must include at least one subject')
      }

      if (isClassTeacher) {
        for (const sectionId of sectionIds) {
          desired.push({
            classId: a.classId,
            sectionId,
            subjectId: null,
            academicYearId: effectiveYearId,
          })
        }
      }

      if (isSubjectTeacher) {
        const subjectSectionIds = sectionIds.length > 0 ? sectionIds : [null]
        for (const subjectId of subjectIds) {
          for (const sectionId of subjectSectionIds) {
            desired.push({
              classId: a.classId,
              sectionId,
              subjectId,
              academicYearId: effectiveYearId,
            })
          }
        }
      }
    }

    // Deduplicate desired rows generated from toggles.
    const desiredRows: DesiredRow[] = []
    const desiredKeys = new Set<string>()
    for (const row of desired) {
      const key = `${row.classId}:${row.sectionId ?? 'null'}:${row.subjectId ?? 'null'}:${row.academicYearId ?? 'null'}`
      if (desiredKeys.has(key)) continue
      desiredKeys.add(key)
      desiredRows.push(row)
    }

    // Validate referenced classes, sections, and subjects
    const classIds = [...new Set(desiredRows.map((d) => d.classId))]
    const sectionIds = [
      ...new Set(desiredRows.map((d) => d.sectionId).filter((id): id is string => id !== null)),
    ]
    const subjectIds = [
      ...new Set(desiredRows.map((d) => d.subjectId).filter((id): id is string => id !== null)),
    ]

    const [classes, sections, subjects] = await Promise.all([
      this.prisma.class.findMany({
        where: { id: { in: classIds }, schoolId },
        select: { id: true },
      }),
      sectionIds.length > 0
        ? this.prisma.section.findMany({
            where: { id: { in: sectionIds }, schoolId },
            select: { id: true, classId: true },
          })
        : Promise.resolve([]),
      subjectIds.length > 0
        ? this.prisma.subject.findMany({
            where: { id: { in: subjectIds }, schoolId, deletedAt: null },
            select: { id: true, classId: true },
          })
        : Promise.resolve([]),
    ])

    const classSet = new Set(classes.map((item) => item.id))
    const sectionsMap = new Map(sections.map((item) => [item.id, item.classId]))
    const subjectsMap = new Map(subjects.map((item) => [item.id, item.classId]))

    for (const row of desired) {
      if (!classSet.has(row.classId)) {
        throw new NotFoundException('Class not found')
      }
      if (row.sectionId && sectionsMap.get(row.sectionId) !== row.classId) {
        throw new BadRequestException('Section does not belong to the selected class')
      }
      if (row.subjectId && subjectsMap.get(row.subjectId) !== row.classId) {
        throw new BadRequestException('Subject does not belong to the selected class')
      }
    }

    // ── Conflict check: class-teacher section rows (subjectId=null) ─────────
    const desiredClassTeacherRows = desiredRows.filter((d) => d.subjectId === null)
    if (desiredClassTeacherRows.length > 0) {
      const desiredClassIds = [...new Set(desiredClassTeacherRows.map((d) => d.classId))]
      const desiredSectionIds = [
        ...new Set(desiredClassTeacherRows.map((d) => d.sectionId).filter((id): id is string => id !== null)),
      ]
      const conflictingClassTeachers = await this.prisma.teacherClassAssignment.findMany({
        where: {
          schoolId,
          isActive: true,
          teacherId: { not: teacherId },
          classId: { in: desiredClassIds },
          sectionId: { in: desiredSectionIds },
          subjectId: null,
          ...this.buildAssignmentAcademicYearFilter(academicYearId),
        },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          teacher: { select: { firstName: true, lastName: true } },
        },
      })

      if (conflictingClassTeachers.length > 0) {
        const conflicts = conflictingClassTeachers.map((row) => {
          const teacherName = `${row.teacher.firstName} ${row.teacher.lastName}`
          const label = row.section?.name
            ? `${row.class.name} (${row.section.name})`
            : row.class.name
          return `${label} already has class teacher ${teacherName}`
        })
        throw new ConflictException([...new Set(conflicts)].join('; '))
      }
    }

    // ── Conflict check: subject-teacher rows ────────────────────────────────
    const desiredSubjectRows = desiredRows.filter((d): d is DesiredRow & { subjectId: string } => d.subjectId !== null)
    if (desiredSubjectRows.length > 0) {
      const desiredClassIds = [...new Set(desiredSubjectRows.map((d) => d.classId))]
      const desiredSubjectIds = [...new Set(desiredSubjectRows.map((d) => d.subjectId))]
      const conflicting = await this.prisma.teacherClassAssignment.findMany({
        where: {
          schoolId,
          isActive: true,
          teacherId: { not: teacherId },
          classId: { in: desiredClassIds },
          subjectId: { in: desiredSubjectIds },
          ...this.buildAssignmentAcademicYearFilter(academicYearId),
        },
        include: {
          class: { select: { name: true } },
          section: { select: { name: true } },
          subject: { select: { name: true } },
          teacher: { select: { firstName: true, lastName: true } },
        },
      })

      // Check each desired row against existing assignments from other teachers
      const conflicts: string[] = []
      for (const d of desiredSubjectRows) {
        for (const c of conflicting) {
          if (!c.subjectId) continue
          if (c.classId !== d.classId || c.subjectId !== d.subjectId) continue
          const sameSection = c.sectionId === d.sectionId
          const otherHasWholeClass = c.sectionId === null
          const weWantWholeClass = d.sectionId === null
          if (sameSection || otherHasWholeClass || weWantWholeClass) {
            const otherName = `${c.teacher.firstName} ${c.teacher.lastName}`
            const className = c.class.name
            const sectionName = c.section?.name
            const subjectName = c.subject?.name || 'Subject'
            const label = sectionName
              ? `${className} (${sectionName}) - ${subjectName}`
              : `${className} - ${subjectName}`
            conflicts.push(`${label} is already assigned to ${otherName}`)
          }
        }
      }

      if (conflicts.length > 0) {
        const unique = [...new Set(conflicts)]
        throw new ConflictException(unique.join('; '))
      }
    }

    // Manage year-specific teaching assignments.
    const existing = await this.prisma.teacherClassAssignment.findMany({
      where: {
        teacherId,
        schoolId,
        ...this.buildAssignmentAcademicYearFilter(academicYearId),
      },
      select: {
        id: true,
        classId: true,
        sectionId: true,
        subjectId: true,
        academicYearId: true,
        isActive: true,
      },
    })

    // Run all mutating operations in a single transaction
    await this.prisma.$transaction(async (tx) => {
      // Step 1: Deactivate all managed assignments in the selected year scope
      const activeIds = existing.filter((a) => a.isActive).map((a) => a.id)
      if (activeIds.length > 0) {
        await tx.teacherClassAssignment.updateMany({
          where: { id: { in: activeIds } },
          data: { isActive: false },
        })
      }

      // Step 2: For each desired row, reactivate an existing record or create a new one.
      const usedIds = new Set<string>()
      for (const d of desiredRows) {
        const match = existing.find(
          (e) =>
            e.classId === d.classId &&
            e.sectionId === d.sectionId &&
            e.subjectId === d.subjectId &&
            e.academicYearId === d.academicYearId &&
            !usedIds.has(e.id),
        )
        if (match) {
          usedIds.add(match.id)
          await tx.teacherClassAssignment.update({
            where: { id: match.id },
            data: { isActive: true, academicYearId: d.academicYearId },
          })
        } else {
          await tx.teacherClassAssignment.create({
            data: {
              teacherId,
              schoolId,
              classId: d.classId,
              sectionId: d.sectionId,
              subjectId: d.subjectId,
              academicYearId: d.academicYearId,
              isActive: true,
            },
          })
        }
      }

      // Step 3: Hard-delete leftover managed duplicates to keep the table clean
      const keepIds = new Set(usedIds)
      const toDelete = existing.filter((e) => !keepIds.has(e.id)).map((e) => e.id)
      if (toDelete.length > 0) {
        await tx.teacherClassAssignment.deleteMany({
          where: { id: { in: toDelete } },
        })
      }
    })

    return this.getClassAssignments(teacherId, schoolId, academicYearId)
  }

  /**
   * Helper: get all classIds, sectionIds, and subjectIds assigned to a teacher.
   * Used by other services (exams, attendance, assignments) to scope data.
   */
  async getTeacherClassScope(
    teacherId: string,
    schoolId: string,
  ): Promise<{ classIds: string[]; sectionIds: string[]; subjectIds: string[] }> {
    const assignments = await this.prisma.teacherClassAssignment.findMany({
      where: { teacherId, schoolId, isActive: true },
      select: { classId: true, sectionId: true, subjectId: true },
    })

    const classIds: string[] = [...new Set(assignments.map((a: any) => a.classId as string))]
    const sectionIds: string[] = [
      ...new Set(
        assignments
          .map((a: any) => a.sectionId as string | null)
          .filter((id): id is string => id !== null),
      ),
    ]
    const subjectIds: string[] = [
      ...new Set(
        assignments
          .map((a: any) => a.subjectId as string | null)
          .filter((id): id is string => id !== null),
      ),
    ]

    return { classIds, sectionIds, subjectIds }
  }
}
