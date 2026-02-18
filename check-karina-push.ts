import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function checkKarinaPush() {
  const karina = await prisma.user.findUnique({
    where: { email: 'karina.d.bikova@gmail.com' },
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          pushSubscription: true,
          notificationsEnabled: true
        }
      }
    }
  })
  
  if (!karina) {
    console.log('❌ Karina not found')
    return
  }
  
  console.log('✅ Karina намерена:')
  console.log('ID:', karina.id)
  console.log('Email:', karina.email)
  console.log('Име:', karina.profile?.firstName, karina.profile?.lastName)
  console.log('')
  console.log('📱 Push Notification Status:')
  console.log('notificationsEnabled:', karina.profile?.notificationsEnabled)
  console.log('pushSubscription:', karina.profile?.pushSubscription ? 'Има subscription ✅' : 'Няма subscription ❌')
  
  if (karina.profile?.pushSubscription) {
    const sub = karina.profile.pushSubscription as any
    console.log('  - Endpoint:', sub.endpoint ? sub.endpoint.substring(0, 50) + '...' : 'N/A')
    console.log('  - Keys:', sub.keys ? 'Present' : 'Missing')
  }
  
  await prisma.$disconnect()
}

checkKarinaPush().catch(console.error)
