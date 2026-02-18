
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/locations - Get current user's location or all visible locations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update lastSeen for current user on every location fetch
    await db.travelerProfile.update({
      where: { userId: session.user.id },
      data: { lastSeen: new Date() }
    }).catch(() => {}) // Silently fail if profile doesn't exist

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'own' or 'visible'
    const includeEmergency = searchParams.get('includeEmergency') === 'true'

    if (type === 'own') {
      // Get current user's location
      const location = await db.location.findFirst({
        where: {
          userId: session.user.id,
          isCurrent: true
        },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ location })
    } else {
      // Get current user's own location and profile
      const currentUser = await db.user.findUnique({
        where: { id: session.user.id },
        include: {
          profile: true,
          locations: {
            where: { isCurrent: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      const visibleLocations = []

      // Add current user's location first (if exists and showOnMap is true)
      if (currentUser?.profile && currentUser.locations?.[0] && currentUser.profile.showOnMap) {
        visibleLocations.push({
          id: currentUser.id,
          name: `${currentUser.profile.firstName} ${currentUser.profile.lastName}`,
          email: currentUser.email,
          isVerified: currentUser.profile.isVerified,
          lastSeen: currentUser.profile.lastSeen,
          emergencyMode: currentUser.profile.emergencyMode,
          vehicleType: currentUser.profile.vehicleType || 'car',
          location: currentUser.locations[0],
          isCurrentUser: true // Flag to identify current user on map
        })
      }

      // Get all visible locations from connections
      const connections = await db.connection.findMany({
        where: {
          OR: [
            { requesterId: session.user.id, status: 'ACCEPTED' },
            { receiverId: session.user.id, status: 'ACCEPTED' }
          ]
        },
        include: {
          requester: {
            include: {
              profile: true,
              locations: {
                where: { isCurrent: true },
                take: 1,
                orderBy: { createdAt: 'desc' }
              }
            }
          },
          receiver: {
            include: {
              profile: true,
              locations: {
                where: { isCurrent: true },
                take: 1,
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      })

      // Filter and add connection locations based on sharing preferences and visibility
      connections.forEach((connection: any) => {
        const otherUser = connection.requesterId === session.user.id 
          ? connection.receiver 
          : connection.requester
        
        if (!otherUser?.profile || !otherUser.locations?.[0]) return
        
        // Check if user wants to be visible on map
        if (!otherUser.profile.showOnMap) return
        
        const sharingLevel = otherUser.profile.locationSharing
        const canSeeLocation = sharingLevel === 'ALWAYS' || 
          sharingLevel === 'CONNECTIONS_ONLY' ||
          (sharingLevel === 'EMERGENCY_ONLY' && includeEmergency)
        
        if (!canSeeLocation) return

        visibleLocations.push({
          id: otherUser.id,
          name: `${otherUser.profile.firstName} ${otherUser.profile.lastName}`,
          email: otherUser.email,
          isVerified: otherUser.profile.isVerified,
          lastSeen: otherUser.profile.lastSeen,
          emergencyMode: otherUser.profile.emergencyMode,
          vehicleType: otherUser.profile.vehicleType || 'car',
          location: otherUser.locations[0],
          isCurrentUser: false
        })
      })

      // Add public users (those with locationSharing = ALWAYS who are not connections)
      const connectionUserIds = connections.map((c: any) => 
        c.requesterId === session.user.id ? c.receiverId : c.requesterId
      )
      
      const publicUsers = await db.user.findMany({
        where: {
          id: {
            notIn: [...connectionUserIds, session.user.id] // Exclude connections and self
          },
          profile: {
            showOnMap: true,
            locationSharing: 'ALWAYS'
          }
        },
        include: {
          profile: true,
          locations: {
            where: { isCurrent: true },
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      // Add public users to visible locations
      publicUsers.forEach((user: any) => {
        if (!user?.profile || !user.locations?.[0]) return
        
        visibleLocations.push({
          id: user.id,
          name: `${user.profile.firstName} ${user.profile.lastName}`,
          email: user.email,
          isVerified: user.profile.isVerified,
          lastSeen: user.profile.lastSeen,
          emergencyMode: user.profile.emergencyMode,
          vehicleType: user.profile.vehicleType || 'car',
          location: user.locations[0],
          isCurrentUser: false
        })
      })

      return NextResponse.json({ locations: visibleLocations })
    }
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST /api/locations - Update current user's location
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { latitude, longitude, accuracy, address, city, country, isEmergency } = body

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' }, 
        { status: 400 }
      )
    }

    // Mark all previous locations as not current
    await db.location.updateMany({
      where: { 
        userId: session.user.id,
        isCurrent: true
      },
      data: { isCurrent: false }
    })

    // Create new current location
    const location = await db.location.create({
      data: {
        userId: session.user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address: address || null,
        city: city || null,
        country: country || null,
        isEmergency: isEmergency || false,
        isCurrent: true
      }
    })

    // Update profile with current location info
    if (city || country) {
      await db.travelerProfile.update({
        where: { userId: session.user.id },
        data: {
          currentCity: city || undefined,
          currentCountry: country || undefined,
          lastSeen: new Date()
        }
      })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
