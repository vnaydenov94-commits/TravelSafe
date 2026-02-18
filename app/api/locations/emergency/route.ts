
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/locations/emergency - Get active emergency alerts
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get emergency alerts within radius or targeted at user
    const alerts = await db.emergencyAlert.findMany({
      where: {
        isActive: true,
        OR: [
          { receiverId: session.user.id },
          { senderId: { not: session.user.id } } // Don't show user's own alerts
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                isVerified: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching emergency alerts:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// POST /api/locations/emergency - Create emergency alert
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      type, 
      message, 
      latitude, 
      longitude, 
      address, 
      radius = 5000, 
      priority = 'HIGH' 
    } = body

    if (!type || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Type, latitude, and longitude are required' }, 
        { status: 400 }
      )
    }

    // Find nearby connections to send alert to
    const connections = await db.connection.findMany({
      where: {
        OR: [
          { requesterId: session.user.id, status: 'ACCEPTED' },
          { receiverId: session.user.id, status: 'ACCEPTED' }
        ]
      },
      include: {
        requester: { include: { locations: { where: { isCurrent: true } } } },
        receiver: { include: { locations: { where: { isCurrent: true } } } }
      }
    })

    // Create emergency alerts for each connection
    const alertPromises = connections.map((connection: any) => {
      const receiverId = connection.requesterId === session.user.id 
        ? connection.receiverId 
        : connection.requesterId

      return db.emergencyAlert.create({
        data: {
          senderId: session.user.id,
          receiverId,
          type,
          message: message || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address: address || null,
          radius: parseFloat(radius),
          priority
        }
      })
    })

    // Also create emergency location record
    const emergencyLocation = db.location.create({
      data: {
        userId: session.user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        isEmergency: true,
        isCurrent: false // Don't override current location
      }
    })

    // Enable emergency mode in profile
    const profileUpdate = db.travelerProfile.update({
      where: { userId: session.user.id },
      data: { 
        emergencyMode: true,
        lastSeen: new Date()
      }
    })

    await Promise.all([...alertPromises, emergencyLocation, profileUpdate])

    return NextResponse.json({ 
      success: true, 
      alertsSent: alertPromises.length 
    })
  } catch (error) {
    console.error('Error creating emergency alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// DELETE /api/locations/emergency - Disable emergency mode
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve user's active alerts
    await db.emergencyAlert.updateMany({
      where: {
        senderId: session.user.id,
        isActive: true
      },
      data: {
        isActive: false,
        isResolved: true,
        resolvedAt: new Date()
      }
    })

    // Disable emergency mode
    await db.travelerProfile.update({
      where: { userId: session.user.id },
      data: { 
        emergencyMode: false,
        lastSeen: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling emergency mode:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
