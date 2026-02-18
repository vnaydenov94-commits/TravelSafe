
'use client'

import { SessionProvider, useSession, signOut } from 'next-auth/react'
import { ThemeProvider } from './theme-provider'
import { LanguageProvider } from '@/lib/language-context'
import { useState, useEffect } from 'react'

// Component to handle session persistence check
function SessionPersistenceCheck({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession() || {}
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    
    // Only check once after session is loaded
    if (status === 'authenticated' && !checked) {
      const rememberSession = localStorage.getItem('travelsafe_remember_session')
      const sessionActive = sessionStorage.getItem('travelsafe_session_active')
      
      // If user didn't check "remember me" and browser was closed (no sessionStorage flag)
      if (!rememberSession && !sessionActive) {
        // User logged in without "remember me" and browser was closed - log them out
        signOut({ redirect: true, callbackUrl: '/auth/signin' })
      } else if (!rememberSession && sessionActive) {
        // Session is still active in this browser session, keep logged in
      }
      setChecked(true)
    }
    
    if (status === 'unauthenticated') {
      setChecked(true)
    }
  }, [status, checked])

  // Show loading while checking session persistence
  if (!checked && status !== 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading TravelSafe...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <SessionProvider>
      <LanguageProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionPersistenceCheck>
            <div style={{ display: mounted ? 'contents' : 'none' }}>
              {children}
            </div>
            {!mounted && (
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading TravelSafe...</p>
                </div>
              </div>
            )}
          </SessionPersistenceCheck>
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  )
}
