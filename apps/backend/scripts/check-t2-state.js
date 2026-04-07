const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const school = await p.school.findUnique({ where: { slug: 'tcf' } });
    if (!school) {
      console.error('School with slug "tcf" not found');
      return;
    }
    const teacher = await p.teacher.findFirst({
      where: { schoolId: school.id, user: { email: 't2@tcf.com' } },
      select: {
        id: true,
        classTeacherOfId: true,
        classAssignments: {
          select: { id: true, classId: true, sectionId: true, subjectId: true, isActive: true },
        },
      },
    });
    if (!teacher) {
      console.error('Teacher with email "t2@tcf.com" not found in school');
      return;
    }
    console.log('classTeacherOfId:', teacher.classTeacherOfId);
    console.log('All assignments (including inactive):');
    for (const a of teacher.classAssignments) {
      console.log(' ', JSON.stringify(a));
    }
  } catch (err) {
    console.error('Error:', err);
    throw err;
  } finally {
    await p.$disconnect();
  }
})();
