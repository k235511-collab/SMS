const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  
  // Find Academic Years
  const ay2026 = await prisma.academicYear.findFirst({
    where: { schoolId, name: { contains: '2026' } }
  });
  const ay2027 = await prisma.academicYear.findFirst({
    where: { schoolId, name: { contains: '2027' } }
  });

  console.log(`Academic Year 2026 ID: ${ay2026?.id}`);
  console.log(`Academic Year 2027 ID: ${ay2027?.id}`);

  if (!ay2026 || !ay2027) {
    console.log('One or both academic years not found');
    return;
  }

  // Find all students in school
  const allStudents = await prisma.student.findMany({
    where: { schoolId, deletedAt: null },
    include: {
      enrollments: true,
      class: true,
      section: true
    }
  });

  console.log(`Total active students in school: ${allStudents.length}`);

  // Find students in 2026 but not in 2027
  const studentsIn2026 = allStudents.filter(s => 
    s.enrollments.some(e => e.academicYearId === ay2026.id)
  );
  const studentsIn2027 = allStudents.filter(s => 
    s.enrollments.some(e => e.academicYearId === ay2027.id)
  );

  const promotedIds = new Set(studentsIn2027.map(s => s.id));
  const notPromoted = studentsIn2026.filter(s => !promotedIds.has(s.id));

  console.log(`\nStudents in 2026-2027: ${studentsIn2026.length}`);
  console.log(`Students already in 2027-2028: ${studentsIn2027.length}`);
  console.log(`Not Promoted from 2026 to 2027: ${notPromoted.length}`);

  console.log('\n--- Not Promoted Student List ---');
  notPromoted.forEach(s => {
    console.log(`- ${s.firstName} ${s.lastName} (Roll: ${s.rollNumber}, Status: ${s.status}, Gender: ${s.gender}, Class: ${s.class?.name || 'N/A'})`);
  });

  // Specifically check for students with status 'LEFT'
  const leftStudents = allStudents.filter(s => s.status === 'LEFT');
  console.log(`\nStudents with status 'LEFT': ${leftStudents.length}`);
  leftStudents.forEach(s => {
    const in2027 = promotedIds.has(s.id);
    console.log(`- ${s.firstName} ${s.lastName} (Roll: ${s.rollNumber}, In 2027-2028: ${in2027})`);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
