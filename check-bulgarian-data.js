
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking Bulgarian travelers in database...\n')

  // Check total users
  const totalUsers = await prisma.user.count()
  console.log(`📊 Total users in database: ${totalUsers}`)

  // Check Bulgarian travelers specifically
  const bulgarianTravelers = await prisma.user.findMany({
    where: {
      profile: {
        currentCountry: 'Bulgaria'
      }
    },
    include: {
      profile: true,
      locations: true
    }
  })

  console.log(`🇧🇬 Bulgarian travelers found: ${bulgarianTravelers.length}`)
  console.log('\n📍 Bulgarian travelers details:')
  
  bulgarianTravelers.forEach((user, index) => {
    const profile = user.profile
    const location = user.locations[0] // Get first location
    console.log(`\n${index + 1}. ${user.name}`)
    console.log(`   📧 Email: ${user.email}`)
    console.log(`   🏙️  City: ${profile?.currentCity}`)
    console.log(`   🚗 Vehicle: ${profile?.vehicleType}`)
    console.log(`   📍 Coordinates: ${location?.latitude}, ${location?.longitude}`)
    console.log(`   ✅ Verified: ${profile?.isVerified}`)
  })

  // Check connections
  const connections = await prisma.connection.count({
    where: {
      status: 'ACCEPTED'
    }
  })
  console.log(`\n🔗 Total accepted connections: ${connections}`)

  // Check emergency resources for Bulgaria
  const bulgarianResources = await prisma.localEmergencyResource.count({
    where: {
      country: 'Bulgaria'
    }
  })
  console.log(`🚨 Bulgarian emergency resources: ${bulgarianResources}`)

  console.log('\n✅ Database check completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error checking database:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
