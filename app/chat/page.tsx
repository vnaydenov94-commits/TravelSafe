import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { ChatClient } from './chat-client'

export default async function ChatPage() {
  const session = await getUserSession()
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Зареждане...</div>}>
      <ChatClient />
    </Suspense>
  )
}
