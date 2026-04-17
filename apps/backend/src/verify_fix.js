const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  const ay2026id = '6e79cb8d-7b75-40b2-aa7e-da02fb920f12';
  const ay2027id = '12345678-1234-1234-1234-123456789abc';

  // Check how many 'LEFT' students are there
  const leftStudents = await prisma.student.findMany({
    where: { schoolId, status: 'LEFT' }
  });
  console.log(`Students with status 'LEFT': ${leftStudents.length}`);

  // Fetch students for promotion like the method does
  const promotionCandidates = await prisma.student.findMany({
    where: {
      id: { in: leftStudents.map(s => s.id) },
      schoolId,
      deletedAt: null,
      status: { not: 'LEFT' },
    }
  });

  console.log(`Promotion candidates among 'LEFT' students (should be 0): ${promotionCandidates.length}`);

  // Verify getPromotionPreview logic
  const invoices = await prisma.invoice.findMany({
    where: {
      schoolId,
      studentId: { in: leftStudents.map(s => s.id) },
      status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      student: {
        status: { not: 'LEFT' },
      },
    }
  });
  console.log(`Invoices for 'LEFT' students in preview (should be 0): ${invoices.length}`);
}

run().finally(() => prisma.$disconnect());
