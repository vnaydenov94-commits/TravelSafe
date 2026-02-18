
const { PrismaClient } = require('@prisma/client')

async function checkData() {
  const prisma = new PrismaClient()
  
  try {
    // Check users
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        locations: {
          where: {
            isCurrent: true
          },
          take: 1
        }
      },
      take: 5
    })
    
    console.log('Users in database:')
    users.forEach(user => {
      const currentLocation = user.locations?.[0]
      console.log(`- ${user.email}: ${user.profile?.firstName} ${user.profile?.lastName}`)
      console.log(`  Vehicle: ${user.profile?.vehicleType}`)
      console.log(`  Location: ${currentLocation?.city}, ${currentLocation?.country}`)
      console.log(`  Coords: ${currentLocation?.latitude}, ${currentLocation?.longitude}`)
      console.log('---')
    })
    
    // Check total counts and connections
    const userCount = await prisma.user.count()
    const locationCount = await prisma.location.count()
    const connectionCount = await prisma.connection.count()
    
    console.log(`\nTotal users: ${userCount}`)
    console.log(`Total locations: ${locationCount}`)
    console.log(`Total connections: ${connectionCount}`)
    
    // Check connections
    const connections = await prisma.connection.findMany({
      include: {
        requester: { select: { email: true } },
        receiver: { select: { email: true } }
      }
    })
    
    console.log('\nConnections:')
    connections.forEach(conn => {
      console.log(`- ${conn.requester.email} -> ${conn.receiver.email} (${conn.status})`)
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
