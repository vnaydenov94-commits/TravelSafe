
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  Shield,
  Clock,
  Globe
} from 'lucide-react'

interface MapStatsData {
  totalConnections: number
  onlineConnections: number
  emergencyAlerts: number
  lastLocationUpdate: string | null
  currentLocation: {
    city?: string
    country?: string
    latitude?: number
    longitude?: number
  } | null
  locationSharing: string
}

interface MapStatsProps {
  className?: string
}

export function MapStats({ className }: MapStatsProps) {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<MapStatsData>({
    totalConnections: 0,
    onlineConnections: 0,
    emergencyAlerts: 0,
    lastLocationUpdate: null,
    currentLocation: null,
    locationSharing: 'CONNECTIONS_ONLY'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true)
        
        // Only fetch if user is authenticated
        if (status !== 'authenticated' || !session?.user) {
          console.log('User not authenticated, skipping stats fetch')
          setIsLoading(false)
          return
        }
        
        // Fetch connections and locations data
        const locationsResponse = await fetch('/api/locations?type=visible', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          const connections = locationsData.locations || []
          
          // Calculate online connections (last seen within 1 hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
          const onlineCount = connections.filter((conn: any) => 
            new Date(conn.lastSeen) > oneHourAgo
          ).length

          setStats(prev => ({
            ...prev,
            totalConnections: connections.length,
            onlineConnections: onlineCount
          }))
        }

        // Get user's own location first
        const ownLocationResponse = await fetch('/api/locations?type=own', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (ownLocationResponse.ok) {
          const ownLocationData = await ownLocationResponse.json()
          const location = ownLocationData.location
          
          if (location) {
            setStats(prev => ({
              ...prev,
              lastLocationUpdate: location.createdAt,
              currentLocation: {
                city: location.city,
                country: location.country,
                latitude: location.latitude,
                longitude: location.longitude
              }
            }))
            
            // Now fetch nearby alerts using user's location
            const nearbyAlertsResponse = await fetch(
              `/api/alerts/nearby?lat=${location.latitude}&lon=${location.longitude}&radius=25`,
              {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                }
              }
            )
            
            if (nearbyAlertsResponse.ok) {
              const alertsData = await nearbyAlertsResponse.json()
              const alerts = alertsData.alerts || []
              
              setStats(prev => ({
                ...prev,
                emergencyAlerts: alerts.length
              }))
            }
          }
        } else if (ownLocationResponse.status === 401) {
          console.log('Unauthorized: User session invalid')
        }

      } catch (error) {
        console.error('Error fetching map stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
    
    // Refresh stats every 30 seconds, but only if authenticated
    const interval = setInterval(() => {
      if (status === 'authenticated' && session?.user) {
        fetchStats()
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [status, session?.user])

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const getSharingLevelColor = (level: string) => {
    switch (level) {
      case 'ALWAYS': return 'bg-green-100 text-green-800'
      case 'CONNECTIONS_ONLY': return 'bg-blue-100 text-blue-800'
      case 'EMERGENCY_ONLY': return 'bg-yellow-100 text-yellow-800'
      case 'OFF': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSharingLevelText = (level: string) => {
    return level.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className={className}>
        <div className="text-center py-8 text-gray-500">
          Please sign in to view map statistics
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Connections */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold">{stats.totalConnections}</p>
                <p className="text-sm text-gray-600">Total Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Online Connections */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-bold text-green-600">{stats.onlineConnections}</p>
                <p className="text-sm text-gray-600">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Alerts */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stats.emergencyAlerts > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.emergencyAlerts > 0 ? 'text-red-600' : 'text-gray-600'}`} />
              </div>
              <div className="ml-3">
                <p className={`text-2xl font-bold ${stats.emergencyAlerts > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {stats.emergencyAlerts}
                </p>
                <p className="text-sm text-gray-600">Active Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Location */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="font-semibold text-sm truncate">
                  {stats.currentLocation?.city && stats.currentLocation?.country 
                    ? `${stats.currentLocation.city}, ${stats.currentLocation.country}`
                    : 'Location unknown'
                  }
                </p>
                <p className="text-sm text-gray-600">Current Location</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Update */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="font-semibold text-sm">
                  {formatLastUpdate(stats.lastLocationUpdate)}
                </p>
                <p className="text-sm text-gray-600">Last Update</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Sharing */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3 flex-1">
                <Badge 
                  variant="secondary" 
                  className={getSharingLevelColor(stats.locationSharing)}
                >
                  {getSharingLevelText(stats.locationSharing)}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">Sharing Level</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
