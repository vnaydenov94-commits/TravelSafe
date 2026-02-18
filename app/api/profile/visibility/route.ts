import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/profile/visibility - Update map visibility and location sharing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { showOnMap, locationSharing } = body

    if (typeof showOnMap !== 'boolean') {
      return NextResponse.json(
        { error: 'showOnMap must be a boolean' }, 
        { status: 400 }
      )
    }

    // Validate locationSharing if provided
    const validLevels = ['OFF', 'EMERGENCY_ONLY', 'CONNECTIONS_ONLY', 'ALWAYS']
    if (locationSharing && !validLevels.includes(locationSharing)) {
      return NextResponse.json(
        { error: 'Invalid locationSharing level' }, 
        { status: 400 }
      )
    }

    // Update user's visibility preferences
    const updateData: any = { showOnMap }
    if (locationSharing) {
      updateData.locationSharing = locationSharing
    }

    const updatedProfile = await db.travelerProfile.update({
      where: { userId: session.user.id },
      data: updateData
    })

    return NextResponse.json({ 
      success: true, 
      showOnMap: updatedProfile.showOnMap,
      locationSharing: updatedProfile.locationSharing
    })
  } catch (error) {
    console.error('Error updating visibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
