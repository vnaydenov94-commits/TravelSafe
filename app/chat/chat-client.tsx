'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChatWindow } from '@/components/chat/chat-window'
import { Button } from '@/components/ui/button'
import { MessageSquare, Map, LayoutDashboard, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function ChatClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>()
  const [showChat, setShowChat] = useState(false)

  // Auto-select user from URL parameter
  useEffect(() => {
    const userIdParam = searchParams.get('userId')
    if (userIdParam) {
      setSelectedUserId(userIdParam)
      setShowChat(true)
      // Clean up URL parameter
      window.history.replaceState({}, '', '/chat')
    }
  }, [searchParams])

  const handleSelectConversation = (userId: string) => {
    setSelectedUserId(userId)
    setShowChat(true)
  }

  const handleBack = () => {
    setShowChat(false)
    setSelectedUserId(undefined)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-500" />
                <h1 className="text-xl font-bold">TravelSafe Chat</h1>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/map">
                  <Map className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full">
          <div className="flex h-full">
            {/* Conversations List - Desktop: Always visible, Mobile: Hidden when chat is open */}
            <div className={`w-full md:w-80 border-r bg-background ${
              showChat ? 'hidden md:block' : 'block'
            }`}>
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <h2 className="font-semibold text-lg">Messages</h2>
                  <p className="text-sm text-muted-foreground">Chat with your connections</p>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ConversationList
                    selectedUserId={selectedUserId}
                    onSelectConversation={handleSelectConversation}
                  />
                </div>
              </div>
            </div>

            {/* Chat Window - Desktop: Always visible if selected, Mobile: Full screen when open */}
            <div className={`flex-1 bg-background ${
              showChat ? 'block' : 'hidden md:block'
            }`}>
              {selectedUserId ? (
                <ChatWindow userId={selectedUserId} onBack={handleBack} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="bg-muted rounded-full p-6 mb-4">
                    <MessageSquare className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Select a conversation</h3>
                  <p className="text-muted-foreground">Choose a conversation from the list to start chatting</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
