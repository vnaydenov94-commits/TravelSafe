import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function testConnection() {
  try {
    const karina = await prisma.user.findFirst({
      where: {
        profile: {
          firstName: 'Karina',
          lastName: 'Bikova'
        }
      }
    })

    const currentUser = await prisma.user.findUnique({
      where: { email: 'john@doe.com' }
    })

    if (!karina || !currentUser) {
      console.log('Users not found')
      return
    }

    // Create connection
    const connection = await prisma.connection.create({
      data: {
        requesterId: currentUser.id,
        receiverId: karina.id,
        status: 'ACCEPTED',
        message: 'Test connection from script'
      }
    })

    console.log('Connection created successfully!')
    console.log('Connection ID:', connection.id)
    console.log('Status:', connection.status)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
