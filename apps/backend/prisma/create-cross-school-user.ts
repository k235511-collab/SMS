import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)

  const tcfSchool = await prisma.school.findUnique({
    where: { slug: 'the-citizen-foundation' },
  })
  if (!tcfSchool) {
    console.log('TCF school not found')
    return
  }

  const adminRole = await prisma.role.findFirst({
    where: { slug: 'admin', schoolId: tcfSchool.id },
  })
  if (!adminRole) {
    console.log('Admin role not found in TCF')
    return
  }

  const existing = await prisma.user.findFirst({
    where: { email: 'admin@demo.com', schoolId: tcfSchool.id },
  })

  if (existing) {
    console.log('User admin@demo.com already exists in TCF:', existing.id)
  } else {
    const u = await prisma.user.create({
      data: {
        email: 'admin@demo.com',
        firstName: 'Admin',
        lastName: 'Demo-Cross',
        passwordHash: hash,
        schoolId: tcfSchool.id,
        roleId: adminRole.id,
      },
    })
    console.log('Created cross-school user in TCF:', u.id)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
