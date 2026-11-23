import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  // Guests get a read-only stream limited to publicly shared locations
  const isGuest = !session?.user?.email

  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          // Get current user (authenticated sessions only)
          const currentUser = isGuest
            ? null
            : await prisma.user.findUnique({
                where: { email: session!.user!.email! },
                include: { profile: true }
              })

          if (!isGuest && !currentUser) {
            controller.close()
            return
          }

          // Respect each user's locationSharing setting:
          //  - ALWAYS           -> visible to everyone (incl. guests)
          //  - CONNECTIONS_ONLY -> visible only to accepted connections
          //  - EMERGENCY_ONLY   -> visible to accepted connections only while in emergency mode
          //  - OFF              -> never visible to others
          // The current user always sees their own marker.
          let visibilityFilter: any = { profile: { showOnMap: true, locationSharing: 'ALWAYS' } }

          if (currentUser) {
            const connections = await prisma.connection.findMany({
              where: {
                status: 'ACCEPTED',
                OR: [{ requesterId: currentUser.id }, { receiverId: currentUser.id }]
              },
              select: { requesterId: true, receiverId: true }
            })
            const connectionIds = connections.map((c) =>
              c.requesterId === currentUser.id ? c.receiverId : c.requesterId
            )

            visibilityFilter = {
              OR: [
                { id: currentUser.id, profile: { showOnMap: true } },
                { profile: { showOnMap: true, locationSharing: 'ALWAYS' } },
                {
                  id: { in: connectionIds },
                  profile: { showOnMap: true, locationSharing: 'CONNECTIONS_ONLY' }
                },
                {
                  id: { in: connectionIds },
                  profile: { showOnMap: true, locationSharing: 'EMERGENCY_ONLY', emergencyMode: true }
                }
              ]
            }
          }

          // Fetch visible users with their active emergency alerts
          const users = await prisma.user.findMany({
            where: {
              ...visibilityFilter,
              locations: { some: { isCurrent: true } }
            },
            include: {
              profile: true,
              locations: {
                where: { isCurrent: true },
                take: 1
              },
              sentAlerts: {
                where: {
                  isActive: true,
                  isResolved: false
                },
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            }
          })

          const locations = users
            .filter(user => user.locations.length > 0)
            .map(user => {
              const location = user.locations[0]
              const activeAlert = user.sentAlerts[0] || null
              return {
                id: user.id,
                name: user.name || 'Unknown',
                vehicleType: user.profile?.vehicleType || 'car',
                location: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  city: location.city,
                  country: location.country
                },
                emergencyMode: user.profile?.emergencyMode || false,
                isVerified: user.profile?.isVerified || false,
                isCurrentUser: currentUser ? user.id === currentUser.id : false,
                lastSeen: user.profile?.lastSeen,
                activeAlert: activeAlert ? {
                  type: activeAlert.type,
                  message: activeAlert.message,
                  priority: activeAlert.priority,
                  createdAt: activeAlert.createdAt
                } : null
              }
            })

          const data = `data: ${JSON.stringify({ locations, timestamp: Date.now() })}\n\n`
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error('SSE error:', error)
        }
      }

      // Send initial data
      await sendUpdate()

      // Send updates every 3 seconds
      const interval = setInterval(sendUpdate, 3000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
