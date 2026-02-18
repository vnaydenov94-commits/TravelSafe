
import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      profile?: {
        id: string
        firstName: string
        lastName: string
        bio?: string | null
        nationality?: string | null
        currentCountry?: string | null
        currentCity?: string | null
        isVerified: boolean
        locationSharing: string
        emergencyMode: boolean
        lastSeen: Date
      } | null
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}
