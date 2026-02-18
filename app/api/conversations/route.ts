import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export async function GET() {
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

    // Get all accepted connections
    const connections = await db.connection.findMany({
      where: {
        OR: [
          { requesterId: currentUser.id },
          { receiverId: currentUser.id }
        ],
        status: 'ACCEPTED'
      },
      include: {
        requester: {
          include: {
            profile: true
          }
        },
        receiver: {
          include: {
            profile: true
          }
        }
      }
    })

    // Get all messages for current user
    const messages = await db.message.findMany({
      where: {
        OR: [
          { senderId: currentUser.id },
          { receiverId: currentUser.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          include: {
            profile: true
          }
        },
        receiver: {
          include: {
            profile: true
          }
        }
      }
    })

    // Build conversations list
    const conversations = connections.map(connection => {
      const otherUser = connection.requesterId === currentUser.id 
        ? connection.receiver 
        : connection.requester

      // Find all messages with this user
      const userMessages = messages.filter(
        msg => 
          (msg.senderId === currentUser.id && msg.receiverId === otherUser.id) ||
          (msg.receiverId === currentUser.id && msg.senderId === otherUser.id)
      )

      // Get last message
      const lastMessage = userMessages[0] || null

      // Count unread messages (sent by other user to current user)
      const unreadCount = userMessages.filter(
        msg => msg.receiverId === currentUser.id && msg.senderId === otherUser.id && !msg.isRead
      ).length

      return {
        userId: otherUser.id,
        name: otherUser.name || `${otherUser.profile?.firstName || ''} ${otherUser.profile?.lastName || ''}`.trim(),
        profileImage: otherUser.profile?.profileImage,
        vehicleType: otherUser.profile?.vehicleType || 'car',
        currentCity: otherUser.profile?.currentCity,
        currentCountry: otherUser.profile?.currentCountry,
        isVerified: otherUser.profile?.isVerified || false,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          isFromMe: lastMessage.senderId === currentUser.id,
          isRead: lastMessage.isRead
        } : null,
        unreadCount,
        lastMessageTime: lastMessage?.createdAt || connection.createdAt
      }
    })

    // Sort by last message time
    conversations.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    )

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
