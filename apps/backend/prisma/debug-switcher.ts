import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const school = await prisma.school.findFirst({
        where: { slug: 'tcf' },
        include: {
            campuses: true,
            roles: {
                include: {
                    permissions: {
                        include: { permission: true }
                    }
                }
            }
        }
    })

    if (!school) {
        console.log('TCF school not found')
        return
    }

    console.log('--- School: TCF ---')
    console.log('Campuses:', school.campuses.map(c => ({ id: c.id, name: c.name, isActive: c.isActive })))

    const superAdminRole = school.roles.find(r => r.slug === 'super_admin')
    if (superAdminRole) {
        console.log('Super Admin Permissions:', superAdminRole.permissions.map(p => p.permission.slug))
    } else {
        console.log('super_admin role not found!')
    }

    const adminUser = await prisma.user.findFirst({
        where: { email: 'admin@tcf.com', schoolId: school.id },
        include: { role: true }
    })

    if (adminUser) {
        console.log('User:', adminUser.email, 'Role Slug:', adminUser.role.slug, 'Campus ID:', adminUser.campusId)
    } else {
        console.log('admin@tcf.com not found')
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
