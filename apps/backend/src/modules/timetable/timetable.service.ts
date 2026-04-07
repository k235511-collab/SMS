import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTimetableSlotDto, UpdateTimetableSlotDto, CreatePeriodTemplateDto, UpdatePeriodTemplateDto } from './dto'

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) { }

  private async resolveAcademicYearId(
    schoolId: string,
    options: { providedAcademicYearId?: string | null; campusId?: string | null },
  ): Promise<string | null> {
    const { providedAcademicYearId } = options

    if (providedAcademicYearId) {
      const year = await this.prisma.academicYear.findFirst({
        where: { id: providedAcademicYearId, schoolId },
        select: { id: true },
      })
      if (!year) {
        throw new BadRequestException('Invalid academic year for this school')
      }
      return year.id
    }

    const schoolCurrentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    })

    return schoolCurrentYear?.id ?? null
  }

  // ─── Time Helpers ──────────────────────────────────────────────────────────

  /** Returns true if two time ranges overlap (HH:mm strings) */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1
  }

  // ─── Slot Validation ──────────────────────────────────────────────────────

  /**
   * Validates no time clashes for the same section and no teacher double-booking.
   * @param excludeSlotId — pass the slot ID being updated so it's excluded from conflict checks
   */
  private async validateSlot(
    schoolId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    sectionId: string,
    teacherId: string | undefined | null,
    excludeSlotId?: string,
  ) {
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time')
    }

    // 1. Check section time overlap — no two slots in the same section can overlap on the same day
    const sectionSlots = await this.prisma.timetableSlot.findMany({
      where: {
        sectionId,
        dayOfWeek,
        schoolId,
        ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
      },
      select: { id: true, startTime: true, endTime: true, subject: { select: { name: true } } },
    })

    for (const existing of sectionSlots) {
      if (this.timesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
        throw new ConflictException(
          `Time clash: this section already has "${existing.subject?.name || 'a subject'}" at ${existing.startTime}–${existing.endTime}`,
        )
      }
    }

    // 2. Check teacher clash — the teacher must not be teaching another section at the same time
    if (teacherId) {
      const teacherSlots = await this.prisma.timetableSlot.findMany({
        where: {
          teacherId,
          dayOfWeek,
          schoolId,
          ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
        },
        include: {
          section: { include: { class: true } },
          subject: true,
        },
      })

      for (const existing of teacherSlots) {
        if (this.timesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
          const className = existing.section?.class?.name || ''
          const sectionName = existing.section?.name || ''
          throw new ConflictException(
            `Teacher is already assigned to ${className} ${sectionName} (${existing.subject?.name}) at ${existing.startTime}–${existing.endTime}`,
          )
        }
      }
    }
  }

  // ─── Timetable Slot CRUD ──────────────────────────────────────────────────

  async create(schoolId: string, dto: CreateTimetableSlotDto, campusId?: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: dto.sectionId, schoolId },
      select: { id: true, class: { select: { campusId: true } } },
    })

    if (!section) {
      throw new NotFoundException(`Section with ID "${dto.sectionId}" not found`)
    }

    const resolvedAcademicYearId = await this.resolveAcademicYearId(schoolId, {
      providedAcademicYearId: dto.academicYearId,
      campusId: section.class?.campusId ?? campusId,
    })

    await this.validateSlot(
      schoolId,
      dto.dayOfWeek,
      dto.startTime,
      dto.endTime,
      dto.sectionId,
      dto.teacherId,
    )

    const { academicYearId: _academicYearId, ...slotData } = dto

    return this.prisma.timetableSlot.create({
      data: {
        ...slotData,
        schoolId,
        academicYearId: resolvedAcademicYearId ?? undefined,
      },
      include: {
        section: { include: { class: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    })
  }

  async findBySection(sectionId: string, schoolId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { sectionId, schoolId },
      include: {
        subject: true,
        teacher: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
  }

  async findByTeacher(teacherId: string, schoolId: string) {
    return this.prisma.timetableSlot.findMany({
      where: { teacherId, schoolId },
      include: {
        section: { include: { class: true } },
        subject: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })
  }

  async update(id: string, schoolId: string, dto: UpdateTimetableSlotDto, campusId?: string) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id, schoolId },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        sectionId: true,
        teacherId: true,
        academicYearId: true,
        section: { select: { class: { select: { campusId: true } } } },
      },
    })

    if (!slot) {
      throw new NotFoundException(`Timetable slot with ID "${id}" not found`)
    }

    // Merge existing values with updates for validation
    const dayOfWeek = dto.dayOfWeek ?? slot.dayOfWeek
    const startTime = dto.startTime ?? slot.startTime
    const endTime = dto.endTime ?? slot.endTime
    const sectionId = slot.sectionId
    const teacherId = dto.teacherId !== undefined ? dto.teacherId : slot.teacherId

    await this.validateSlot(schoolId, dayOfWeek, startTime, endTime, sectionId, teacherId, id)

    const resolvedAcademicYearId = await this.resolveAcademicYearId(schoolId, {
      providedAcademicYearId: (dto as any).academicYearId ?? slot.academicYearId,
      campusId: slot.section?.class?.campusId ?? campusId,
    })

    const { academicYearId: _academicYearId, ...updateData } = dto as any

    return this.prisma.timetableSlot.update({
      where: { id },
      data: {
        ...updateData,
        academicYearId: resolvedAcademicYearId ?? undefined,
      },
      include: {
        section: { include: { class: true } },
        subject: true,
        teacher: true,
        academicYear: true,
      },
    })
  }

  async remove(id: string, schoolId: string) {
    const slot = await this.prisma.timetableSlot.findFirst({
      where: { id, schoolId },
    })

    if (!slot) {
      throw new NotFoundException(`Timetable slot with ID "${id}" not found`)
    }

    return this.prisma.timetableSlot.delete({ where: { id } })
  }

  // ─── Teacher Free Time ────────────────────────────────────────────────────

  /**
   * Returns teachers who are NOT booked at the given day+time.
   * Useful for populating the teacher dropdown showing only available ones.
   */
  async findFreeTeachers(schoolId: string, dayOfWeek: number, startTime: string, endTime: string, campusId?: string) {
    // Get all active teachers for this school (filtered by campus if provided)
    const teacherWhere: any = { schoolId, isActive: true }
    if (campusId) teacherWhere.campusId = campusId

    const allTeachers = await this.prisma.teacher.findMany({
      where: teacherWhere,
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: { firstName: 'asc' },
    })

    // Get teachers who have overlapping slots at this time
    const busySlots = await this.prisma.timetableSlot.findMany({
      where: { schoolId, dayOfWeek },
      select: { teacherId: true, startTime: true, endTime: true },
    })

    const busyTeacherIds = new Set<string>()
    for (const slot of busySlots) {
      if (slot.teacherId && this.timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        busyTeacherIds.add(slot.teacherId)
      }
    }

    return allTeachers.map((t) => ({
      ...t,
      isFree: !busyTeacherIds.has(t.id),
    }))
  }

  /**
   * Returns a teacher's full weekly schedule with all slots and free periods.
   */
  async getTeacherSchedule(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
    })

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found`)
    }

    const slots = await this.prisma.timetableSlot.findMany({
      where: { teacherId, schoolId },
      include: {
        section: { include: { class: true } },
        subject: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    const periods = await this.prisma.periodTemplate.findMany({
      where: { schoolId },
      orderBy: { sortOrder: 'asc' },
    })

    return { teacher, slots, periods }
  }

  // ─── Period Templates ─────────────────────────────────────────────────────

  async findPeriods(schoolId: string, campusId?: string) {
    if (campusId) {
      // Prioritize campus-specific periods
      const campusPeriods = await this.prisma.periodTemplate.findMany({
        where: { schoolId, campusId },
        orderBy: { sortOrder: 'asc' },
      })
      if (campusPeriods.length > 0) return campusPeriods
    }

    // Fall back to school-wide periods
    return this.prisma.periodTemplate.findMany({
      where: { schoolId, campusId: null },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async createPeriod(schoolId: string, dto: CreatePeriodTemplateDto, campusId?: string) {
    // Check for duplicate start time within same school+campus
    const existing = await this.prisma.periodTemplate.findFirst({
      where: { schoolId, campusId: campusId || null, startTime: dto.startTime },
    })
    if (existing) {
      throw new ConflictException(`A period already exists at ${dto.startTime}`)
    }

    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Start time must be before end time')
    }

    // Auto-assign sortOrder if not provided
    if (dto.sortOrder === undefined) {
      const last = await this.prisma.periodTemplate.findFirst({
        where: { schoolId, campusId: campusId || null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      dto.sortOrder = (last?.sortOrder ?? 0) + 1
    }

    return this.prisma.periodTemplate.create({
      data: { ...dto, schoolId, campusId: campusId || null },
    })
  }

  async updatePeriod(id: string, schoolId: string, dto: UpdatePeriodTemplateDto) {
    const period = await this.prisma.periodTemplate.findFirst({
      where: { id, schoolId },
    })
    if (!period) {
      throw new NotFoundException(`Period template not found`)
    }

    // If changing startTime, check for duplicates
    if (dto.startTime && dto.startTime !== period.startTime) {
      const duplicate = await this.prisma.periodTemplate.findFirst({
        where: { schoolId, campusId: period.campusId || null, startTime: dto.startTime, NOT: { id } },
      })
      if (duplicate) {
        throw new ConflictException(`A period already exists at ${dto.startTime}`)
      }
    }

    const startTime = dto.startTime ?? period.startTime
    const endTime = dto.endTime ?? period.endTime
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time')
    }

    return this.prisma.periodTemplate.update({
      where: { id },
      data: dto,
    })
  }

  async removePeriod(id: string, schoolId: string) {
    const period = await this.prisma.periodTemplate.findFirst({
      where: { id, schoolId },
    })
    if (!period) {
      throw new NotFoundException(`Period template not found`)
    }

    return this.prisma.periodTemplate.delete({ where: { id } })
  }

  async resetPeriods(schoolId: string, campusId?: string) {
    const DEFAULT_PERIODS = [
      { label: 'Period 1', startTime: '08:00', endTime: '08:45', sortOrder: 1, isBreak: false },
      { label: 'Period 2', startTime: '08:45', endTime: '09:30', sortOrder: 2, isBreak: false },
      { label: 'Period 3', startTime: '09:30', endTime: '10:15', sortOrder: 3, isBreak: false },
      { label: 'Break', startTime: '10:15', endTime: '10:30', sortOrder: 4, isBreak: true },
      { label: 'Period 4', startTime: '10:30', endTime: '11:15', sortOrder: 5, isBreak: false },
      { label: 'Period 5', startTime: '11:15', endTime: '12:00', sortOrder: 6, isBreak: false },
      { label: 'Period 6', startTime: '12:00', endTime: '12:45', sortOrder: 7, isBreak: false },
      { label: 'Lunch', startTime: '12:45', endTime: '13:30', sortOrder: 8, isBreak: true },
      { label: 'Period 7', startTime: '13:30', endTime: '14:15', sortOrder: 9, isBreak: false },
      { label: 'Period 8', startTime: '14:15', endTime: '15:00', sortOrder: 10, isBreak: false },
    ]

    // Delete existing periods for this school+campus
    const deleteWhere: any = { schoolId }
    if (campusId) deleteWhere.campusId = campusId
    else deleteWhere.campusId = null
    await this.prisma.periodTemplate.deleteMany({ where: deleteWhere })

    // Recreate defaults
    await this.prisma.periodTemplate.createMany({
      data: DEFAULT_PERIODS.map((d) => ({ ...d, schoolId, campusId: campusId || null })),
    })

    return this.findPeriods(schoolId, campusId)
  }
}
