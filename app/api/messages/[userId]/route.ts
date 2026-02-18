import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
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

    const { userId } = params

    // Verify connection exists
    const connection = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId: userId },
          { requesterId: userId, receiverId: currentUser.id }
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

    // Get all messages between these two users
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: currentUser.id, receiverId: userId },
          { senderId: userId, receiverId: currentUser.id }
        ]
      },
      orderBy: { createdAt: 'asc' },
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

    // Mark messages as read (messages sent by other user to current user)
    await db.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUser.id,
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    // Get other user info
    const otherUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
            vehicleType: true,
            currentCity: true,
            currentCountry: true,
            isVerified: true
          }
        }
      }
    })

    return NextResponse.json({
      messages: messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        type: msg.type,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        isFromMe: msg.senderId === currentUser.id,
        sender: {
          id: msg.sender.id,
          name: msg.sender.name || `${msg.sender.profile?.firstName || ''} ${msg.sender.profile?.lastName || ''}`.trim(),
          profileImage: msg.sender.profile?.profileImage,
          vehicleType: msg.sender.profile?.vehicleType || 'car'
        }
      })),
      otherUser: otherUser ? {
        id: otherUser.id,
        name: otherUser.name || `${otherUser.profile?.firstName || ''} ${otherUser.profile?.lastName || ''}`.trim(),
        profileImage: otherUser.profile?.profileImage,
        vehicleType: otherUser.profile?.vehicleType || 'car',
        currentCity: otherUser.profile?.currentCity,
        currentCountry: otherUser.profile?.currentCountry,
        isVerified: otherUser.profile?.isVerified || false
      } : null
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
