
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    const events = await prisma.calendarEvent.findMany()
    console.log('Total events:', events.length)
    
    const ids = events.map(e => e.id)
    const uniqueIds = new Set(ids)
    
    if (ids.length !== uniqueIds.size) {
      console.log('DUPLICATE IDS FOUND!')
      const counts = {}
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1
      })
      Object.entries(counts).filter(([id, count]) => count > 1).forEach(([id, count]) => {
        console.log(`ID ${id} appears ${count} times`)
      })
    } else {
      console.log('No duplicate IDs found.')
    }

    const emptyIdEvents = events.filter(e => !e.id || e.id === '')
    if (emptyIdEvents.length > 0) {
      console.log('Found events with empty IDs:', emptyIdEvents.length)
    }

  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

main()
