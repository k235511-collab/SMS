import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    try {
        const schools = await prisma.school.findMany({
            select: { id: true, name: true, slug: true }
        });
        console.log('--- SCHOOLS ---');
        console.log(JSON.stringify(schools, null, 2));

        const tcf = await prisma.school.findFirst({
            where: { name: { contains: 'Citizen' } }
        });
        console.log('\n--- TCF SCHOOL ---');
        console.log(JSON.stringify(tcf, null, 2));

        if (tcf) {
            const scales = await prisma.gradingScale.findMany({
                where: { schoolId: tcf.id }
            });
            console.log('\n--- TCF GRADING SCALES ---');
            console.log(JSON.stringify(scales, null, 2));
        }

        const user = await prisma.user.findFirst({
            where: { OR: [{ firstName: { contains: 'Jawaid' } }, { lastName: { contains: 'Noor' } }] },
            include: {
                role: {
                    include: {
                        permissions: { include: { permission: true } }
                    }
                }
            }
        });
        console.log('\n--- USER & PERMISSIONS ---');
        if (user) {
            console.log(`User: ${user.firstName} ${user.lastName} (Role: ${user.role.slug})`);
            const permSlugs = user.role.permissions.map(rp => rp.permission.slug);
            console.log('Permission Slugs:', JSON.stringify(permSlugs, null, 2));
            console.log('Has READ_EXAM:', permSlugs.includes('read:exams'));
        } else {
            console.log('User Jawaid Noor not found');
        }
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}
main();
