import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📊 Checking database status...\n')

  // Count total users
  const totalUsers = await prisma.user.count()
  console.log(`Total users: ${totalUsers}`)

  // List all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          currentCity: true,
          currentCountry: true,
          locationSharing: true
        }
      },
      locations: {
        where: { isCurrent: true },
        select: {
          city: true,
          country: true,
          latitude: true,
          longitude: true
        }
      }
    }
  })

  console.log('\n👥 Users in database:')
  users.forEach(user => {
    console.log(`\n  - ${user.email}`)
    console.log(`    Name: ${user.profile?.firstName} ${user.profile?.lastName}`)
    console.log(`    Location: ${user.locations[0]?.city || 'Unknown'}, ${user.locations[0]?.country || 'Unknown'}`)
    console.log(`    Location Sharing: ${user.profile?.locationSharing || 'Not set'}`)
  })

  // Count connections
  const totalConnections = await prisma.connection.count()
  console.log(`\n\n🔗 Total connections: ${totalConnections}`)

  // List connections
  const connections = await prisma.connection.findMany({
    select: {
      status: true,
      requester: {
        select: { email: true }
      },
      receiver: {
        select: { email: true }
      }
    }
  })

  if (connections.length > 0) {
    console.log('\nConnection details:')
    connections.forEach(conn => {
      console.log(`  ${conn.requester.email} <-> ${conn.receiver.email} (${conn.status})`)
    })
  } else {
    console.log('No connections found.')
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
