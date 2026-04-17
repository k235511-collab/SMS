const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  const invoices = await prisma.invoice.findMany({
    where: { schoolId },
    select: { id: true, academicYearId: true, rollNumber: true }
  });
  
  const statusSummary = {};
  invoices.forEach(inv => {
    const year = inv.academicYearId || 'NULL';
    statusSummary[year] = (statusSummary[year] || 0) + 1;
  });
  
  console.log('Invoice count by AcademicYearId:', JSON.stringify(statusSummary, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
