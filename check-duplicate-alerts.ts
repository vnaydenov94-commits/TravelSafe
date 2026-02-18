import 'dotenv/config'
import { prisma } from './lib/db'

async function checkAlerts() {
  const alerts = await prisma.emergencyAlert.findMany({
    where: {
      isActive: true,
      isResolved: false
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log('\n=== ACTIVE ALERTS ===')
  console.log(`Total active alerts: ${alerts.length}\n`)
  
  // Group by sender
  const bySender = new Map<string, any[]>()
  alerts.forEach(alert => {
    const senderId = alert.sender.id
    if (!bySender.has(senderId)) {
      bySender.set(senderId, [])
    }
    bySender.get(senderId)!.push(alert)
  })
  
  bySender.forEach((userAlerts, senderId) => {
    const user = userAlerts[0].sender
    console.log(`\n👤 ${user.profile?.firstName} ${user.profile?.lastName} (${user.email})`)
    console.log(`   Alerts: ${userAlerts.length}`)
    userAlerts.forEach((alert, idx) => {
      console.log(`   ${idx + 1}. ${alert.type} - ${alert.priority} - ${new Date(alert.createdAt).toLocaleString('bg-BG')}`)
    })
  })
  
  // Find duplicates
  const duplicates = Array.from(bySender.entries()).filter(([_, alerts]) => alerts.length > 1)
  if (duplicates.length > 0) {
    console.log('\n\n⚠️  PROBLEM: Found users with multiple active alerts!')
    console.log('   This causes duplicates in the UI.')
  }
}

checkAlerts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
