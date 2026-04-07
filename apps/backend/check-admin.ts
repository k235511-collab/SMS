import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const school = await prisma.school.findFirst({ where: { name: 'The Citizen Foundation' } })
  if(!school) {
    console.log('School not found')
    return;
  }

  const role = await prisma.role.findFirst({ where: { slug: 'super_admin', schoolId: school.id } })
  if(!role) {
    console.log('Role not found')
    return;
  }

  const admin = await prisma.user.findFirst({
    where: { schoolId: school.id, roleId: role.id },
    include: { profile: true }
  })

  console.log('Admin Data:', JSON.stringify(admin, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
