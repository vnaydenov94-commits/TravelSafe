'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getVehicleTypeById } from '@/lib/vehicle-types'
import { format } from 'date-fns'
import { CheckCheck, Check } from 'lucide-react'

interface Conversation {
  userId: string
  name: string
  profileImage?: string
  vehicleType: string
  currentCity?: string
  currentCountry?: string
  isVerified: boolean
  lastMessage: {
    content: string
    createdAt: string
    isFromMe: boolean
    isRead: boolean
  } | null
  unreadCount: number
  lastMessageTime: string
}

interface ConversationListProps {
  selectedUserId?: string
  onSelectConversation: (userId: string) => void
}

export function ConversationList({ selectedUserId, onSelectConversation }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = await response.json()
      setConversations(data.conversations)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return format(date, 'HH:mm')
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return format(date, 'EEEE')
    } else {
      return format(date, 'dd/MM/yyyy')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground mb-2">No conversations yet</p>
        <p className="text-sm text-muted-foreground">Connect with travelers to start chatting</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {conversations.map(conversation => {
          const vehicleType = getVehicleTypeById(conversation.vehicleType || 'car')
          const VehicleIcon = vehicleType.icon
          const isSelected = selectedUserId === conversation.userId

          return (
            <Card
              key={conversation.userId}
              className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                isSelected ? 'bg-accent border-blue-500' : ''
              }`}
              onClick={() => onSelectConversation(conversation.userId)}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.profileImage} />
                    <AvatarFallback>
                      {conversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div 
                    className="absolute -bottom-1 -right-1 rounded-full p-1"
                    style={{ backgroundColor: vehicleType.color }}
                  >
                    <VehicleIcon className="h-3 w-3 text-white" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-medium text-sm truncate">{conversation.name}</h3>
                      {conversation.isVerified && (
                        <Badge variant="secondary" className="h-4 px-1 text-xs">✓</Badge>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {conversation.lastMessage ? (
                        <>
                          {conversation.lastMessage.isFromMe && (
                            conversation.lastMessage.isRead ? (
                              <CheckCheck className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Check className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            )
                          )}
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage.content}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge className="ml-2 bg-blue-500 hover:bg-blue-600 h-5 min-w-[20px] justify-center">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>

                  {(conversation.currentCity || conversation.currentCountry) && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      📍 {conversation.currentCity}, {conversation.currentCountry}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </ScrollArea>
  )
}
