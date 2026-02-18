import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

// Haversine formula to calculate distance between two points
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const radiusKm = parseFloat(searchParams.get('radius') || '25')
    const userLat = parseFloat(searchParams.get('lat') || '0')
    const userLon = parseFloat(searchParams.get('lon') || '0')

    if (userLat === 0 && userLon === 0) {
      // Try to get user's last known location
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { locations: { where: { isCurrent: true }, take: 1 } }
      })
      
      if (!user?.locations[0]) {
        return NextResponse.json({ alerts: [], message: 'No location available' })
      }
    }

    // Get all active emergency alerts from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const allAlerts = await prisma.emergencyAlert.findMany({
      where: {
        isActive: true,
        isResolved: false,
        createdAt: { gte: twentyFourHoursAgo }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                vehicleType: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Filter alerts within radius and deduplicate by sender (keep only the most recent alert per user)
    const alertsWithDistance = allAlerts
      .map((alert: typeof allAlerts[0]) => {
        const distance = getDistanceKm(userLat, userLon, alert.latitude, alert.longitude)
        return { ...alert, distanceKm: Math.round(distance * 10) / 10 }
      })
      .filter((alert: { distanceKm: number }) => alert.distanceKm <= radiusKm)
    
    // Deduplicate: keep only the most recent alert per sender
    const uniqueAlertsBySender = new Map<string, typeof alertsWithDistance[0]>()
    alertsWithDistance.forEach(alert => {
      const existing = uniqueAlertsBySender.get(alert.senderId)
      if (!existing || new Date(alert.createdAt) > new Date(existing.createdAt)) {
        uniqueAlertsBySender.set(alert.senderId, alert)
      }
    })
    
    const nearbyAlerts = Array.from(uniqueAlertsBySender.values())
      .sort((a, b) => a.distanceKm - b.distanceKm)

    return NextResponse.json({
      alerts: nearbyAlerts,
      count: nearbyAlerts.length,
      radiusKm,
      userLocation: { lat: userLat, lon: userLon }
    })
  } catch (error) {
    console.error('Error fetching nearby alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}
