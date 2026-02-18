import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Get John's user ID
  const john = await prisma.user.findUnique({
    where: { email: 'john@doe.com' }
  })

  console.log('📊 John connections:')
  const connections = await prisma.connection.findMany({
    where: {
      OR: [
        { requesterId: john?.id, status: 'ACCEPTED' },
        { receiverId: john?.id, status: 'ACCEPTED' }
      ]
    },
    include: {
      requester: {
        select: { email: true }
      },
      receiver: {
        select: { email: true }
      }
    }
  })

  connections.forEach(conn => {
    const otherEmail = conn.requesterId === john?.id ? conn.receiver.email : conn.requester.email
    console.log(`  - ${otherEmail}`)
  })

  console.log('\n📍 All users with locations:')
  const usersWithLocations = await prisma.user.findMany({
    include: {
      profile: {
        select: {
          showOnMap: true,
          locationSharing: true
        }
      },
      locations: {
        where: { isCurrent: true },
        select: { city: true, country: true }
      }
    }
  })

  usersWithLocations.forEach(user => {
    const hasLocation = user.locations.length > 0
    console.log(`  ${user.email}: location=${hasLocation ? user.locations[0].city : 'none'}, showOnMap=${user.profile?.showOnMap}, sharing=${user.profile?.locationSharing}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
