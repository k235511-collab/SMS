const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  const ay2027id = '12345678-1234-1234-1234-123456789abc';

  const invoiceCount = await prisma.invoice.count({
    where: { academicYearId: ay2027id }
  });

  const totalInvoices = await prisma.invoice.count({
    where: { schoolId }
  });

  console.log(`Invoices for 2027-2028: ${invoiceCount}`);
  console.log(`Total Invoices for school: ${totalInvoices}`);

  // Check some invoices without year
  const orphanedInvoices = await prisma.invoice.count({
    where: { schoolId, academicYearId: null }
  });
  console.log(`Orphaned Invoices: ${orphanedInvoices}`);

  // Fetch the first 5 invoices for this school to see their current year
  const sample = await prisma.invoice.findMany({
    where: { schoolId },
    take: 10,
    select: { id: true, academicYearId: true, rollNumber: true, totalAmount: true }
  });
  console.log('Sample Invoices:');
  console.log(JSON.stringify(sample, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
