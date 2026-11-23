
import Link from 'next/link'
import { getUserSession } from '@/lib/auth'
import { MapWrapper } from '@/components/map/map-wrapper'

export default async function MapPage() {
  // The map is public: guests get a read-only view, while write actions
  // (sharing location, emergency/roadside alerts) still require sign-in.
  const user = await getUserSession()
  const isGuest = !user

  return (
    <div className="h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">TravelSafe Map</h1>
                <p className="text-xs text-gray-600">Real-time traveler locations</p>
              </div>
            </div>
            {isGuest ? (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/auth/signin">
                <button className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  Sign In
                </button>
              </Link>
              <Link href="/auth/signup">
                <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors">
                  Sign Up
                </button>
              </Link>
            </div>
            ) : (
            <div className="flex items-center space-x-4">
              <Link href="/chat">
                <button className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                    <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                  </svg>
                  Messages
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zM11 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zM11 12a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" clipRule="evenodd" />
                  </svg>
                  Dashboard
                </button>
              </Link>
              <span className="text-sm text-gray-600 hidden sm:block">
                {(user as any)?.profile?.firstName} {(user as any)?.profile?.lastName}
              </span>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {(user as any)?.profile?.firstName?.[0] || (user as any)?.name?.[0] || 'U'}
                </span>
              </div>
            </div>
            )}
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="h-[calc(100vh-3.5rem)]">
        <MapWrapper 
          height="100%" 
          showControls={true}
          showEmergencyButton={true}
          readOnly={isGuest}
        />
      </div>
    </div>
  )
}
