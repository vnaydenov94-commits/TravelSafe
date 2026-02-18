import 'dotenv/config'
import { prisma } from './lib/db'

async function fixDuplicates() {
  console.log('🔍 Търсене на дубликати...\n')
  
  const alerts = await prisma.emergencyAlert.findMany({
    where: {
      isActive: true,
      isResolved: false
    },
    orderBy: { createdAt: 'desc' }
  })
  
  // Group by sender and keep only the newest alert for each sender
  const bySender = new Map<string, any[]>()
  alerts.forEach(alert => {
    const senderId = alert.senderId
    if (!bySender.has(senderId)) {
      bySender.set(senderId, [])
    }
    bySender.get(senderId)!.push(alert)
  })
  
  let deletedCount = 0
  
  for (const [senderId, userAlerts] of bySender.entries()) {
    if (userAlerts.length > 1) {
      // Keep the first one (newest), delete the rest
      const toKeep = userAlerts[0]
      const toDelete = userAlerts.slice(1)
      
      console.log(`👤 Sender ${senderId}: ${userAlerts.length} алерта`)
      console.log(`   ✅ Запазва се: ${toKeep.id} (${toKeep.type}) от ${new Date(toKeep.createdAt).toLocaleString('bg-BG')}`)
      
      for (const alert of toDelete) {
        console.log(`   ❌ Изтрива се: ${alert.id} (${alert.type}) от ${new Date(alert.createdAt).toLocaleString('bg-BG')}`)
        await prisma.emergencyAlert.delete({
          where: { id: alert.id }
        })
        deletedCount++
      }
      console.log()
    }
  }
  
  console.log(`\n✅ Готово! Изтрити ${deletedCount} дубликата.`)
  
  // Verify
  const remaining = await prisma.emergencyAlert.count({
    where: {
      isActive: true,
      isResolved: false
    }
  })
  console.log(`📊 Остават ${remaining} активни алерта.`)
}

fixDuplicates()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Грешка:', err)
    process.exit(1)
  })
