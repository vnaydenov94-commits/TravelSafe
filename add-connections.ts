import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Create a new public user without connection to John
  const hashedPassword = await bcrypt.hash('test123', 10)
  
  const newUser = await prisma.user.create({
    data: {
      email: 'peter.ivanov@test.com',
      name: 'Peter Ivanov',
      password: hashedPassword,
      profile: {
        create: {
          firstName: 'Peter',
          lastName: 'Ivanov',
          nationality: 'Bulgaria',
          homeCountry: 'Bulgaria',
          vehicleType: 'car',
          locationSharing: 'ALWAYS',
          showOnMap: true,
          isVerified: true,
          bio: 'Public traveler, visible to everyone'
        }
      },
      locations: {
        create: {
          latitude: 42.6977,
          longitude: 23.3219,
          city: 'Sofia',
          country: 'Bulgaria',
          address: 'Sofia Center',
          isCurrent: true
        }
      }
    }
  })

  console.log('✅ Created new public user: peter.ivanov@test.com')
  console.log('   Password: test123')
  console.log('   Location: Sofia, Bulgaria')
  console.log('   Visibility: PUBLIC (ALWAYS)')
  console.log('   NOT connected to John Doe')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
