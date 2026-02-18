
import { getUserSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'
import { prisma } from '@/lib/db'

export default async function DashboardPage() {
  const session = await getUserSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch user profile and basic data
  const userWithProfile = await prisma.user.findUnique({
    where: { id: (session.user as any)?.id },
    include: {
      profile: true,
      locations: {
        where: { isCurrent: true },
        take: 1
      },
      sentConnections: {
        where: { status: 'ACCEPTED' },
        include: {
          receiver: {
            include: { profile: true }
          }
        }
      },
      receivedConnections: {
        where: { status: 'ACCEPTED' },
        include: {
          requester: {
            include: { profile: true }
          }
        }
      }
    }
  })

  const connections = [
    ...userWithProfile?.sentConnections?.map(c => c.receiver) || [],
    ...userWithProfile?.receivedConnections?.map(c => c.requester) || []
  ]

  return (
    <DashboardClient 
      user={userWithProfile} 
      connections={connections}
    />
  )
}
