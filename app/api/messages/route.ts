import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { receiverId, content, type = 'TEXT' } = await request.json()

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      )
    }

    // Verify connection exists
    const connection = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId },
          { requesterId: receiverId, receiverId: currentUser.id }
        ],
        status: 'ACCEPTED'
      }
    })

    if (!connection) {
      return NextResponse.json(
        { error: 'No connection with this user' },
        { status: 403 }
      )
    }

    // Create message
    const message = await db.message.create({
      data: {
        senderId: currentUser.id,
        receiverId,
        content,
        type,
        isRead: false
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
                profileImage: true,
                vehicleType: true
              }
            }
          }
        }
      }
    })

    // Send push notification to receiver (non-blocking)
    const senderName = message.sender.name || `${message.sender.profile?.firstName || ''} ${message.sender.profile?.lastName || ''}`.trim()
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        receiverId,
        title: `Ново съобщение от ${senderName}`,
        body: content.length > 100 ? content.substring(0, 100) + '...' : content,
        data: {
          url: `/chat?userId=${currentUser.id}`,
          senderId: currentUser.id,
          senderName
        }
      })
    }).catch(err => {
      console.error('Failed to send push notification:', err)
      // Don't fail the message send if push fails
    })

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        isRead: message.isRead,
        createdAt: message.createdAt,
        isFromMe: true,
        sender: {
          id: message.sender.id,
          name: message.sender.name || `${message.sender.profile?.firstName || ''} ${message.sender.profile?.lastName || ''}`.trim(),
          profileImage: message.sender.profile?.profileImage,
          vehicleType: message.sender.profile?.vehicleType || 'car'
        }
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
