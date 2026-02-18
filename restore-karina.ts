import { prisma } from './lib/db'
import bcrypt from 'bcryptjs'

async function main() {
  const hashedPassword = await bcrypt.hash('karina123', 10)
  
  const user = await prisma.user.create({
    data: {
      email: 'karina.d.bikova@gmail.com',
      name: 'Karina Bikova',
      password: hashedPassword,
      profile: {
        create: {
          firstName: 'Karina',
          lastName: 'Bikova',
          nationality: 'Bulgaria',
          homeCountry: 'Bulgaria',
          currentCountry: 'Bulgaria',
          currentCity: 'Sofia',
          vehicleType: 'car',
          locationSharing: 'CONNECTIONS_ONLY',
          showOnMap: true,
          isVerified: true
        }
      },
      locations: {
        create: {
          latitude: 42.6977,
          longitude: 23.3219,
          city: 'Sofia',
          country: 'Bulgaria',
          isCurrent: true
        }
      }
    }
  })
  
  console.log('✅ Restored Karina account:', user.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
