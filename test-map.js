
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function testLocationAPI() {
  const prisma = new PrismaClient()
  
  try {
    // Get John's user ID for simulation
    const john = await prisma.user.findUnique({
      where: { email: 'john@doe.com' },
      include: { profile: true }
    })
    
    if (!john) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log(`✅ Found test user: ${john.email}`)
    console.log(`   Vehicle: ${john.profile?.vehicleType}`)
    
    // Simulate what the locations API would return for John
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: john.id, status: 'ACCEPTED' },
          { receiverId: john.id, status: 'ACCEPTED' }
        ]
      },
      include: {
        requester: {
          include: {
            profile: true,
            locations: {
              where: { isCurrent: true },
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        receiver: {
          include: {
            profile: true,
            locations: {
              where: { isCurrent: true },
              take: 1,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    })

    console.log(`\n📍 John should see ${connections.length} connections:`)
    
    const visibleLocations = connections.map(connection => {
      const otherUser = connection.requesterId === john.id 
        ? connection.receiver 
        : connection.requester
      
      if (!otherUser?.profile || !otherUser.locations?.[0]) return null
      
      const sharingLevel = otherUser.profile.locationSharing
      const canSeeLocation = sharingLevel === 'ALWAYS' || 
        sharingLevel === 'CONNECTIONS_ONLY'
      
      if (!canSeeLocation) return null

      return {
        id: otherUser.id,
        name: `${otherUser.profile.firstName} ${otherUser.profile.lastName}`,
        email: otherUser.email,
        vehicleType: otherUser.profile.vehicleType || 'car',
        location: otherUser.locations[0],
        locationSharing: sharingLevel
      }
    }).filter(Boolean)
    
    console.log(`\n🗺️  Map should show ${visibleLocations.length} other travelers:`)
    visibleLocations.forEach(user => {
      console.log(`   • ${user.name} (${user.vehicleType}) at ${user.location.city}, ${user.location.country}`)
      console.log(`     Coords: ${user.location.latitude}, ${user.location.longitude}`)
      console.log(`     Sharing: ${user.locationSharing}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLocationAPI()
