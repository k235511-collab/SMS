
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const campuses = await prisma.campus.findMany()
    console.log('Total campuses:', campuses.length)
    campuses.forEach(c => {
      console.log(`Campus: "${c.name}", ID: "${c.id}"`)
    })
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
