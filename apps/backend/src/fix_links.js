const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const schoolId = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';
  
  // Find Academic Years exactly
  const ay2026 = await prisma.academicYear.findFirst({
    where: { schoolId, name: '2026-2027' }
  });
  const ay2027 = await prisma.academicYear.findFirst({
    where: { schoolId, name: '2027-2028' }
  });

  if (!ay2026 || !ay2027) {
    console.log('Years not found (searching by exact name)');
    // Fallback search
    const allYears = await prisma.academicYear.findMany({ where: { schoolId } });
    console.log('Available years:', allYears.map(y => y.name));
    return;
  }

  console.log(`Linking orphaned data to: 2026 (${ay2026.id}) and 2027 (${ay2027.id})`);

  // Link Invoices created before 2027-04-11 to 2026-2027
  const updatedInvoices26 = await prisma.invoice.updateMany({
    where: {
      schoolId,
      academicYearId: null,
      createdAt: { lt: new Date('2027-04-11') }
    },
    data: { academicYearId: ay2026.id }
  });
  console.log(`Linked ${updatedInvoices26.count} invoices to 2026-2027`);

  // Link Invoices created on or after 2027-04-11 to 2027-2028
  const updatedInvoices27 = await prisma.invoice.updateMany({
    where: {
      schoolId,
      academicYearId: null,
      createdAt: { gte: new Date('2027-04-11') }
    },
    data: { academicYearId: ay2027.id }
  });
  console.log(`Linked ${updatedInvoices27.count} invoices to 2027-2028`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
