import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@travelsafe.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

// POST /api/push/send - Send push notification to user(s)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { receiverId, title, body, data } = await request.json()

    if (!receiverId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get receiver's push subscription
    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      include: {
        profile: {
          select: {
            pushSubscription: true,
            notificationsEnabled: true
          }
        }
      }
    })

    if (!receiver?.profile) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
    }

    // Check if notifications are enabled
    if (!receiver.profile.notificationsEnabled || !receiver.profile.pushSubscription) {
      return NextResponse.json({ 
        success: false,
        message: 'Receiver has notifications disabled or no subscription' 
      })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'message-notification',
      data: data || {},
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })

    // Send push notification
    try {
      await webpush.sendNotification(
        receiver.profile.pushSubscription as any,
        payload
      )

      return NextResponse.json({ 
        success: true,
        message: 'Push notification sent successfully' 
      })
    } catch (pushError: any) {
      console.error('Error sending push notification:', pushError)
      
      // If subscription is invalid/expired, remove it from database
      if (pushError.statusCode === 410 || pushError.statusCode === 404) {
        await db.travelerProfile.update({
          where: { userId: receiverId },
          data: {
            pushSubscription: Prisma.JsonNull,
            notificationsEnabled: false
          }
        })
      }

      return NextResponse.json(
        { error: 'Failed to send push notification', details: pushError.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in push send endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
