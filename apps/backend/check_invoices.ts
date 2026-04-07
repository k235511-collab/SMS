import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const invoices = await prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, invoiceNo: true, schoolId: true }
    });
    console.log("Recent Invoices:", invoices);

    const schools = await prisma.school.findMany({
        take: 2,
        select: { id: true, code: true, lastInvoiceNo: true }
    });
    console.log("Schools:", schools);
}

main().catch(console.error).finally(() => prisma.$disconnect());
