const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    const r = await p.teacherClassAssignment.updateMany({
      where: { id: '6e936ccd-3b1e-4597-8875-7c269f86aa06' },
      data: { isActive: false },
    });
    console.log('Deactivated:', r.count);
  } catch (err) {
    console.error('Error deactivating assignment:', err);
    throw err;
  } finally {
    await p.$disconnect();
  }
})();
