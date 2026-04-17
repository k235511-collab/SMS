const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const years = await prisma.academicYear.findMany({
    where: { schoolId: '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f' }
  });
  console.log(JSON.stringify(years, null, 2));
}

run().finally(() => prisma.$disconnect());
