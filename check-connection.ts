import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkConnection() {
  try {
    // Find Karina
    const karina = await prisma.user.findFirst({
      where: {
        profile: {
          firstName: 'Karina',
          lastName: 'Bikova'
        }
      },
      include: {
        profile: true
      }
    })

    if (!karina) {
      console.log('❌ Karina not found')
      return
    }

    console.log('✅ Karina found:', karina.email, '- ID:', karina.id)

    // Find current test user (john@doe.com)
    const currentUser = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    })

    if (!currentUser) {
      console.log('❌ Current user not found')
      return
    }

    console.log('✅ Current user:', currentUser.email, '- ID:', currentUser.id)

    // Check connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId: karina.id },
          { requesterId: karina.id, receiverId: currentUser.id }
        ]
      }
    })

    if (connection) {
      console.log('✅ Connection exists - Status:', connection.status)
    } else {
      console.log('❌ No connection between users')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkConnection()
