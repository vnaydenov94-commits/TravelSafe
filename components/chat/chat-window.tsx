'use client'

import { useEffect, useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getVehicleTypeById } from '@/lib/vehicle-types'
import { format } from 'date-fns'
import { Send, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  id: string
  content: string
  type: string
  isRead: boolean
  createdAt: string
  isFromMe: boolean
  sender: {
    id: string
    name: string
    profileImage?: string
    vehicleType: string
  }
}

interface OtherUser {
  id: string
  name: string
  profileImage?: string
  vehicleType: string
  currentCity?: string
  currentCountry?: string
  isVerified: boolean
}

interface ChatWindowProps {
  userId: string
  onBack?: () => void
}

export function ChatWindow({ userId, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchMessages()
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(data.messages)
      setOtherUser(data.otherUser)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('') // Clear input immediately

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: userId,
          content: messageContent,
          type: 'TEXT'
        })
      })

      if (!response.ok) throw new Error('Failed to send message')
      
      const data = await response.json()
      setMessages(prev => [...prev, data.message])
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'HH:mm')
  }

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return 'Today'
    } else if (days === 1) {
      return 'Yesterday'
    } else {
      return format(date, 'dd MMMM yyyy')
    }
  }

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = formatMessageDate(message.createdAt)
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">User not found</p>
      </div>
    )
  }

  const vehicleType = getVehicleTypeById(otherUser.vehicleType || 'car')
  const VehicleIcon = vehicleType.icon
  const messageGroups = groupMessagesByDate()

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser.profileImage} />
              <AvatarFallback>
                {otherUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div 
              className="absolute -bottom-1 -right-1 rounded-full p-1"
              style={{ backgroundColor: vehicleType.color }}
            >
              <VehicleIcon className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <h2 className="font-semibold">{otherUser.name}</h2>
              {otherUser.isVerified && (
                <Badge variant="secondary" className="h-4 px-1 text-xs">✓</Badge>
              )}
            </div>
            {(otherUser.currentCity || otherUser.currentCountry) && (
              <p className="text-sm text-muted-foreground">
                📍 {otherUser.currentCity}, {otherUser.currentCountry}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4" ref={scrollRef}>
          {Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {date}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {dateMessages.map((message, idx) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${message.isFromMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!message.isFromMe && idx === 0 && (
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.sender.profileImage} />
                          <AvatarFallback>
                            {message.sender.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      {!message.isFromMe && idx > 0 && <div className="w-8 flex-shrink-0" />}
                      
                      <div>
                        <Card
                          className={`p-3 ${
                            message.isFromMe
                              ? 'bg-blue-500 text-white border-blue-500'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </Card>
                        <p className={`text-xs text-muted-foreground mt-1 ${
                          message.isFromMe ? 'text-right' : 'text-left'
                        }`}>
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
