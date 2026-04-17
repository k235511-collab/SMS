import { PrismaClient, StudentStatus } from '@prisma/client';

const prisma = new PrismaClient();
const SCHOOL_ID = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
const YEAR_NAME = '2027-2028';
const START_DATE = new Date('2027-04-11');
const END_DATE = new Date('2028-04-30');

async function restore() {
  console.log('🚀 Starting restoration of Academic Year 2027-2028...');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create the Academic Year
      const academicYear = await tx.academicYear.create({
        data: {
          name: YEAR_NAME,
          startDate: START_DATE,
          endDate: END_DATE,
          schoolId: SCHOOL_ID,
          isCurrent: true,
          isActive: true,
        },
      });

      console.log(`✅ Created Academic Year: ${academicYear.id}`);

      // 2. Unset current flag for other years of this school
      await tx.academicYear.updateMany({
        where: {
          schoolId: SCHOOL_ID,
          id: { not: academicYear.id },
        },
        data: { isCurrent: false },
      });

      // 3. Update School's current academic year
      await tx.school.update({
        where: { id: SCHOOL_ID },
        data: { currentAcademicYearId: academicYear.id },
      });

      // 4. Restore 17 Student Enrollments
      // We find students who are currently NOT enrolled in any year but belong to this school
      const unenrolledStudents = await tx.student.findMany({
        where: {
          schoolId: SCHOOL_ID,
          enrollments: { none: {} },
        },
      });

      console.log(`🔍 Found ${unenrolledStudents.length} unenrolled students. Restoring...`);

      for (const student of unenrolledStudents) {
        if (student.classId && student.sectionId) {
          await tx.studentEnrollment.create({
            data: {
              studentId: student.id,
              academicYearId: academicYear.id,
              classId: student.classId,
              sectionId: student.sectionId,
              schoolId: SCHOOL_ID,
              status: StudentStatus.ACTIVE,
            },
          });
        }
      }

      // 5. "Connect All Things" - Search for orphans in relevant tables
      // We look for records with NULL academicYearId OR records that fall in this date range
      
      console.log('🔗 Re-linking invoices and other data...');

      // Invoices - more aggressive: Link anything in the date range or currently NULL for this school
      const invoiceUpdate = await tx.invoice.updateMany({
        where: {
          schoolId: SCHOOL_ID,
          OR: [
            { academicYearId: null },
            { 
              dueDate: { 
                gte: START_DATE, 
                lte: END_DATE 
              } 
            }
          ]
        },
        data: { academicYearId: academicYear.id },
      });
      console.log(`📈 Linked ${invoiceUpdate.count} invoices to the new year.`);

      // Exams
      const examUpdate = await tx.exam.updateMany({
        where: {
          schoolId: SCHOOL_ID,
          OR: [
            { academicYearId: null },
            { startDate: { gte: START_DATE, lte: END_DATE } }
          ]
        },
        data: { academicYearId: academicYear.id },
      });
      console.log(`📝 Linked ${examUpdate.count} exams.`);

      // Timetable Slots
      const slotUpdate = await tx.timetableSlot.updateMany({
        where: {
          schoolId: SCHOOL_ID,
          academicYearId: null,
        },
        data: { academicYearId: academicYear.id },
      });
      console.log(`🕒 Linked ${slotUpdate.count} timetable slots.`);

      // Teacher Class Assignments
      const assignmentUpdate = await tx.teacherClassAssignment.updateMany({
        where: {
          schoolId: SCHOOL_ID,
          academicYearId: null,
        },
        data: { academicYearId: academicYear.id },
      });
       console.log(`👨‍🏫 Linked ${assignmentUpdate.count} teacher assignments.`);

    });

    console.log('✨ Restoration completed successfully!');
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restore();
