import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  // Update one user (not connected to John) to be publicly visible
  const updatedProfile = await prisma.travelerProfile.updateMany({
    where: {
      user: {
        email: 'karina.d.bikova@gmail.com' // This user is not connected to John
      }
    },
    data: {
      showOnMap: true,
      locationSharing: 'ALWAYS'
    }
  })

  console.log('✅ Updated Karina to be publicly visible:', updatedProfile)

  // Check the current visibility settings
  const profiles = await prisma.travelerProfile.findMany({
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  })

  console.log('\n📊 All user visibility settings:')
  profiles.forEach(profile => {
    console.log(`  ${profile.user.email}: showOnMap=${profile.showOnMap}, locationSharing=${profile.locationSharing}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
