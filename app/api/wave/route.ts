import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Check if connection exists
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId: targetUserId, status: 'ACCEPTED' },
          { requesterId: targetUserId, receiverId: currentUser.id, status: 'ACCEPTED' }
        ]
      }
    })

    if (!connection) {
      return NextResponse.json({ error: 'No connection with this user' }, { status: 403 })
    }

    // Get target user's push subscription
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: {
          select: {
            pushSubscription: true,
            notificationsEnabled: true
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    const senderName = currentUser.profile?.firstName && currentUser.profile?.lastName
      ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
      : currentUser.name || 'Someone'

    // Send push notification
    if (targetUser.profile?.pushSubscription && targetUser.profile?.notificationsEnabled) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: targetUserId,
            title: '👋 Wave!',
            body: `${senderName} is waving at you!`,
            data: {
              url: `/chat?userId=${currentUser.id}`,
              type: 'wave'
            }
          })
        })
      } catch (pushError) {
        console.error('Failed to send wave notification:', pushError)
        // Continue even if push notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Wave sent successfully',
      hasPushNotification: !!targetUser.profile?.pushSubscription
    })
  } catch (error) {
    console.error('Error sending wave:', error)
    return NextResponse.json(
      { error: 'Failed to send wave' },
      { status: 500 }
    )
  }
}
