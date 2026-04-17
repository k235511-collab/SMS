const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  const ay2026id = '6e79cb8d-7b75-40b2-aa7e-da02fb920f12';
  const ay2027id = '12345678-1234-1234-1234-123456789abc';
  
  try {
    const enrollments2026 = await prisma.studentEnrollment.findMany({
      where: { academicYearId: ay2026id },
      include: { student: true }
    });

    const enrollments2027 = await prisma.studentEnrollment.findMany({
      where: { academicYearId: ay2027id }
    });

    const promotedIds = new Set(enrollments2027.map(e => e.studentId));
    const notPromoted = enrollments2026.filter(e => !promotedIds.has(e.studentId));

    console.log(`\nStudents in 2026-2027: ${enrollments2026.length}`);
    console.log(`Students in 2027-2028: ${enrollments2027.length}`);
    console.log(`Not Promoted from 2026 to 2027: ${notPromoted.length}`);

    console.log('\n--- Not Promoted Student List ---');
    notPromoted.forEach(e => {
      console.log(`- ${e.student.firstName} ${e.student.lastName} (Roll: ${e.student.rollNumber}, Status: ${e.student.status}, Gender: ${e.student.gender})`);
    });

    // check if any of these not promoted students have status LEFT
    const leftButNotPromoted = notPromoted.filter(e => e.student.status === 'LEFT');
    console.log(`\nLeft students not promoted: ${leftButNotPromoted.length}`);

    // Check if any student who IS promoted has status LEFT
    const promotedStudents = await prisma.student.findMany({
      where: { id: { in: Array.from(promotedIds) } }
    });
    const leftButPromoted = promotedStudents.filter(s => s.status === 'LEFT');
    console.log(`\nLeft students who WERE promoted: ${leftButPromoted.length}`);
    leftButPromoted.forEach(s => console.log(`- ${s.firstName} ${s.lastName}`));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
