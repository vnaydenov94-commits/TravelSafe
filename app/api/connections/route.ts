import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// POST /api/connections - Send connection request
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

    const { receiverId, message } = await request.json()

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      )
    }

    // Check if connection already exists
    const existingConnection = await db.connection.findFirst({
      where: {
        OR: [
          { requesterId: currentUser.id, receiverId },
          { requesterId: receiverId, receiverId: currentUser.id }
        ]
      }
    })

    if (existingConnection) {
      // If connection is already accepted, return success
      if (existingConnection.status === 'ACCEPTED') {
        return NextResponse.json({ 
          connection: existingConnection,
          message: 'Connection already exists' 
        })
      }
      // If pending, return the existing request
      return NextResponse.json({ 
        connection: existingConnection,
        message: 'Connection request already sent' 
      })
    }

    // Create new connection request
    const connection = await db.connection.create({
      data: {
        requesterId: currentUser.id,
        receiverId,
        status: 'ACCEPTED', // Auto-accept for messaging from map
        message: message || 'Connection request from map'
      }
    })

    return NextResponse.json({ 
      connection,
      message: 'Connection created successfully' 
    })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json(
      { error: 'Failed to create connection' },
      { status: 500 }
    )
  }
}
