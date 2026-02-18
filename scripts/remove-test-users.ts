import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Starting cleanup of test users...')

  // Keep only john@doe.com (main test account)
  const keepEmail = 'john@doe.com'

  // Get all users except the one we want to keep
  const usersToDelete = await prisma.user.findMany({
    where: {
      email: {
        not: keepEmail
      }
    },
    select: { id: true, email: true }
  })

  console.log(`Found ${usersToDelete.length} test users to delete:`)
  usersToDelete.forEach(user => console.log(`  - ${user.email}`))

  if (usersToDelete.length === 0) {
    console.log('✅ No test users to delete!')
    return
  }

  const userIds = usersToDelete.map(u => u.id)

  // Delete in correct order to respect foreign key constraints
  console.log('\n🔄 Deleting related data...')

  // 1. Delete messages
  const deletedMessages = await prisma.message.deleteMany({
    where: {
      OR: [
        { senderId: { in: userIds } },
        { receiverId: { in: userIds } }
      ]
    }
  })
  console.log(`  ✓ Deleted ${deletedMessages.count} messages`)

  // 2. Delete connections
  const deletedConnections = await prisma.connection.deleteMany({
    where: {
      OR: [
        { requesterId: { in: userIds } },
        { receiverId: { in: userIds } }
      ]
    }
  })
  console.log(`  ✓ Deleted ${deletedConnections.count} connections`)

  // 3. Delete emergency alerts
  const deletedAlerts = await prisma.emergencyAlert.deleteMany({
    where: {
      OR: [
        { senderId: { in: userIds } },
        { receiverId: { in: userIds } }
      ]
    }
  })
  console.log(`  ✓ Deleted ${deletedAlerts.count} emergency alerts`)

  // 4. Delete check-ins
  const deletedCheckIns = await prisma.checkIn.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedCheckIns.count} check-ins`)

  // 5. Delete locations
  const deletedLocations = await prisma.location.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedLocations.count} locations`)

  // 6. Delete traveler profiles
  const deletedProfiles = await prisma.travelerProfile.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedProfiles.count} traveler profiles`)

  // 7. Delete accounts
  const deletedAccounts = await prisma.account.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedAccounts.count} accounts`)

  // 8. Delete sessions
  const deletedSessions = await prisma.session.deleteMany({
    where: { userId: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedSessions.count} sessions`)

  // 9. Finally, delete users
  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } }
  })
  console.log(`  ✓ Deleted ${deletedUsers.count} users`)

  console.log('\n✅ Cleanup complete!')
  console.log(`\n📝 Remaining user: ${keepEmail}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
