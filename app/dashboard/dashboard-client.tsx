
'use client'

import { useState, useEffect, useCallback } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { MapStats } from '@/components/map/map-stats'
import { Slider } from '@/components/ui/slider'
import { RoadsideHelpModal } from '@/components/map/roadside-help-modal'
import { EmergencyAlertModal } from '@/components/map/emergency-alert-modal'
import { 
  MapPin, 
  Users, 
  Shield, 
  MessageCircle, 
  Bell, 
  Settings, 
  LogOut,
  Globe,
  Phone,
  Navigation,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Radar,
  RefreshCw,
  Car,
  Wrench
} from 'lucide-react'
import { getVehicleTypeById } from '@/lib/vehicle-types'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { toast } from 'sonner'

interface User {
  id: string
  name: string | null
  email: string
  profile: {
    firstName: string
    lastName: string
    bio?: string | null
    currentCountry?: string | null
    currentCity?: string | null
    nationality?: string | null
    vehicleType: string
    locationSharing: string
    isVerified: boolean
    showOnMap: boolean
    lastSeen: Date
  } | null
  locations: Array<{
    latitude: number
    longitude: number
    city?: string | null
    country?: string | null
  }>
}

interface Connection {
  id: string
  name: string | null
  profile: {
    firstName: string
    lastName: string
    currentCity?: string | null
    currentCountry?: string | null
    lastSeen: Date
  } | null
}

interface DashboardClientProps {
  user: User | null
  connections: Connection[]
}

export function DashboardClient({ user, connections }: DashboardClientProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  
  // Push notifications
  const {
    isSupported: pushSupported,
    isSubscribed,
    isLoading: pushLoading,
    permission,
    subscribe,
    unsubscribe
  } = usePushNotifications()
  
  // Determine initial visibility level based on showOnMap and locationSharing
  const getVisibilityLevel = () => {
    if (!user?.profile?.showOnMap) return 'hidden'
    if (user?.profile?.locationSharing === 'ALWAYS') return 'public'
    return 'connections'
  }
  
  const [visibilityLevel, setVisibilityLevel] = useState(getVisibilityLevel())
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)
  
  // Active Alerts state
  const [alertRadius, setAlertRadius] = useState(25) // km
  const [nearbyAlerts, setNearbyAlerts] = useState<Array<{
    id: string
    type: string
    message: string | null
    distanceKm: number
    priority: string
    createdAt: string
    sender: {
      id: string
      name: string | null
      profile: { firstName: string; lastName: string; vehicleType: string } | null
    }
  }>>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false)
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null)
  
  // Emergency modals state
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showRoadsideModal, setShowRoadsideModal] = useState(false)
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false)

  const currentLocation = user?.locations?.[0]

  // Fetch nearby alerts
  const fetchNearbyAlerts = useCallback(async (lat: number, lon: number, radius: number) => {
    setIsLoadingAlerts(true)
    try {
      const res = await fetch(`/api/alerts/nearby?lat=${lat}&lon=${lon}&radius=${radius}`)
      if (res.ok) {
        const data = await res.json()
        setNearbyAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setIsLoadingAlerts(false)
    }
  }, [])

  // Get user location and fetch alerts
  useEffect(() => {
    if (currentLocation) {
      setUserCoords({ lat: currentLocation.latitude, lon: currentLocation.longitude })
      fetchNearbyAlerts(currentLocation.latitude, currentLocation.longitude, alertRadius)
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          fetchNearbyAlerts(pos.coords.latitude, pos.coords.longitude, alertRadius)
        },
        () => {
          // Default to Sofia if no location
          setUserCoords({ lat: 42.6977, lon: 23.3219 })
          fetchNearbyAlerts(42.6977, 23.3219, alertRadius)
        }
      )
    }
  }, [currentLocation, alertRadius, fetchNearbyAlerts])

  // Auto-refresh alerts every 30 seconds
  useEffect(() => {
    if (!userCoords) return
    const interval = setInterval(() => {
      fetchNearbyAlerts(userCoords.lat, userCoords.lon, alertRadius)
    }, 30000)
    return () => clearInterval(interval)
  }, [userCoords, alertRadius, fetchNearbyAlerts])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  const handleViewMap = () => {
    router.push('/map')
  }

  const handleEmergencyAlert = () => {
    setShowEmergencyOptions(true)
  }

  const getUserLocation = (): [number, number] | null => {
    if (currentLocation) {
      return [currentLocation.latitude, currentLocation.longitude]
    }
    if (userCoords) {
      return [userCoords.lat, userCoords.lon]
    }
    return null
  }

  const handleVisibilityChange = async (level: string) => {
    setIsUpdatingVisibility(true)
    try {
      let showOnMap = true
      let locationSharing = 'CONNECTIONS_ONLY'
      
      if (level === 'hidden') {
        showOnMap = false
      } else if (level === 'public') {
        locationSharing = 'ALWAYS'
      } else {
        locationSharing = 'CONNECTIONS_ONLY'
      }
      
      const response = await fetch('/api/profile/visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ showOnMap, locationSharing }),
      })

      if (response.ok) {
        setVisibilityLevel(level)
        router.refresh()
      } else {
        alert('Failed to update visibility setting')
      }
    } catch (error) {
      console.error('Error updating visibility:', error)
      alert('Failed to update visibility setting')
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const handleUpdateLocation = async () => {
    setIsUpdatingLocation(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setIsUpdatingLocation(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords

          // Reverse geocoding to get city and country
          const geocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`
          )
          const geocodeData = await geocodeResponse.json()

          const city = geocodeData.address?.city || 
                       geocodeData.address?.town || 
                       geocodeData.address?.village || 
                       geocodeData.address?.municipality || 
                       'Unknown'
          const country = geocodeData.address?.country || 'Unknown'

          // Update location via API
          const response = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              accuracy,
              city,
              country,
              isEmergency: false
            })
          })

          if (response.ok) {
            // Refresh the page to show updated location
            router.refresh()
          } else {
            setLocationError('Failed to update location')
          }
        } catch (error) {
          console.error('Error updating location:', error)
          setLocationError('Error updating location')
        } finally {
          setIsUpdatingLocation(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        setLocationError('Unable to retrieve your location. Please check your browser permissions.')
        setIsUpdatingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-blue-600 p-2 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-gray-900">TravelSafe</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleViewMap}
                className="hidden sm:flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Live Map
              </Button>
              <span className="text-sm text-gray-600">
                Welcome, {user?.profile?.firstName || user?.name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {user?.profile?.firstName}! 
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600">
                  {currentLocation ? (
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Currently in {currentLocation.city}, {currentLocation.country}
                    </span>
                  ) : (
                    "Your travel dashboard is ready"
                  )}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUpdateLocation}
                  disabled={isUpdatingLocation}
                  className="flex items-center gap-2"
                >
                  <Navigation className={`h-3 w-3 ${isUpdatingLocation ? 'animate-spin' : ''}`} />
                  {isUpdatingLocation ? 'Updating...' : 'Update Location'}
                </Button>
              </div>
              {locationError && (
                <p className="text-red-500 text-sm mt-2">{locationError}</p>
              )}
            </div>
            {user?.profile?.isVerified && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Shield className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </div>

        {/* Map Statistics */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Map Overview
              </CardTitle>
              <CardDescription>
                Real-time location and connection statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapStats />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
                <CardDescription>Your traveler information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Full Name:</span>
                    <span>{user?.profile?.firstName} {user?.profile?.lastName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Email:</span>
                    <span>{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Nationality:</span>
                    <span>{user?.profile?.nationality || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Vehicle Type:</span>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const vehicleType = user?.profile?.vehicleType ? getVehicleTypeById(user.profile.vehicleType) : null
                        if (vehicleType) {
                          const Icon = vehicleType.icon
                          return (
                            <>
                              <Icon 
                                className="h-4 w-4" 
                                style={{ color: vehicleType.color }}
                              />
                              <span>{vehicleType.name}</span>
                            </>
                          )
                        }
                        return <span>Not specified</span>
                      })()}
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <div className="mb-3">
                      <span className="font-medium flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Map Visibility
                      </span>
                      <span className="text-xs text-gray-500">
                        Choose who can see your location on the map
                      </span>
                    </div>
                    <RadioGroup
                      value={visibilityLevel}
                      onValueChange={handleVisibilityChange}
                      disabled={isUpdatingVisibility}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="hidden" id="hidden" className="mt-1" />
                        <Label htmlFor="hidden" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Hidden</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            You are completely hidden from the map
                          </p>
                        </Label>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="connections" id="connections" className="mt-1" />
                        <Label htmlFor="connections" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Connections Only</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Only your connected friends can see you
                          </p>
                        </Label>
                      </div>
                      
                      <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                        <RadioGroupItem value="public" id="public" className="mt-1" />
                        <Label htmlFor="public" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Public</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            All registered users can see you on the map
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Notifications */}
                  <div className="pt-4 border-t">
                    <div className="mb-3">
                      <span className="font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Известия за съобщения
                      </span>
                      <span className="text-xs text-gray-500">
                        Получавай известия при нови съобщения
                      </span>
                    </div>
                    
                    {!pushSupported ? (
                      <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-md">
                        Известията не се поддържат от твоя браузър
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div className="flex items-center gap-3">
                            {isSubscribed ? (
                              <>
                                <Bell className="h-5 w-5 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium">Включени</p>
                                  <p className="text-xs text-gray-500">Ще получаваш известия</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Bell className="h-5 w-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium">Изключени</p>
                                  <p className="text-xs text-gray-500">Няма да получаваш известия</p>
                                </div>
                              </>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={isSubscribed ? "outline" : "default"}
                            onClick={async () => {
                              if (isSubscribed) {
                                const success = await unsubscribe()
                                if (success) {
                                  toast.success('Известията са изключени')
                                } else {
                                  toast.error('Грешка при изключване на известията')
                                }
                              } else {
                                const success = await subscribe()
                                if (success) {
                                  toast.success('Известията са включени! 🔔')
                                } else {
                                  toast.error('Грешка при включване на известията')
                                }
                              }
                            }}
                            disabled={pushLoading || permission === 'denied'}
                          >
                            {pushLoading ? (
                              'Зареждане...'
                            ) : isSubscribed ? (
                              'Изключи'
                            ) : (
                              'Включи'
                            )}
                          </Button>
                        </div>
                        
                        {permission === 'denied' && (
                          <div className="text-xs text-amber-600 p-2 bg-amber-50 rounded-md">
                            ⚠️ Разрешението за известия е отказано. Моля промени настройките на браузъра.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {user?.profile?.bio && (
                    <div>
                      <span className="font-medium block mb-2">Bio:</span>
                      <p className="text-gray-600">{user.profile.bio}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Essential TravelSafe features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Button 
                      onClick={handleEmergencyAlert}
                      className="h-20 w-full flex-col bg-red-700 hover:bg-red-800 text-white"
                    >
                      <AlertTriangle className="h-6 w-6 mb-2" />
                      Emergency Alert
                    </Button>
                    
                    {/* Dropdown Options */}
                    {showEmergencyOptions && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setShowEmergencyOptions(false)
                            setShowRoadsideModal(true)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-center gap-3 border-b"
                        >
                          <span className="text-xl">🚧</span>
                          <div>
                            <p className="font-medium text-gray-900">Request Roadside Help</p>
                            <p className="text-xs text-gray-500">Flat tyre, battery, fuel, towing</p>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setShowEmergencyOptions(false)
                            setShowEmergencyModal(true)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 flex items-center gap-3"
                        >
                          <span className="text-xl">🆘</span>
                          <div>
                            <p className="font-medium text-gray-900">Full Emergency Alert</p>
                            <p className="text-xs text-gray-500">Medical, safety, police, fire</p>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col bg-green-500 hover:bg-green-600 text-white border-green-600"
                    onClick={() => {
                      alert('Safety check-in completed! You are marked as safe.');
                    }}
                  >
                    <Bell className="h-6 w-6 mb-2" />
                    Safety Check-in
                  </Button>
                  <Button 
                    onClick={handleViewMap}
                    className="h-20 flex-col bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Navigation className="h-6 w-6 mb-2" />
                    View Map
                  </Button>
                  <Button 
                    onClick={() => router.push('/chat')}
                    className="h-20 flex-col bg-amber-400 hover:bg-amber-500 text-gray-900"
                  >
                    <MessageCircle className="h-6 w-6 mb-2" />
                    Messages
                  </Button>
                  <Button 
                    onClick={() => router.push('/provider/register')}
                    className="h-20 flex-col col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    <Wrench className="h-6 w-6 mb-2" />
                    Become a Service Provider
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connections */}
            <Card>
              <CardHeader>
                <CardTitle>Your Connections</CardTitle>
                <CardDescription>
                  {connections.length} travel {connections.length === 1 ? 'connection' : 'connections'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connections.length > 0 ? (
                  <div className="space-y-3">
                    {connections.slice(0, 5).map((connection) => (
                      <div key={connection.id} className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {connection.profile?.firstName} {connection.profile?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {connection.profile?.currentCity}, {connection.profile?.currentCountry}
                          </p>
                        </div>
                      </div>
                    ))}
                    {connections.length > 5 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          alert('Showing all connections feature coming soon!');
                        }}
                      >
                        View all connections
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Users className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No connections yet</p>
                    <Button 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        router.push('/map');
                      }}
                    >
                      Find Travelers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Alerts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Radar className="h-5 w-5 text-orange-500" />
                      Active Alerts
                    </CardTitle>
                    <CardDescription>Alerts within {alertRadius} km</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => userCoords && fetchNearbyAlerts(userCoords.lat, userCoords.lon, alertRadius)}
                    disabled={isLoadingAlerts}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Radius Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Обхват:</span>
                      <span className="font-medium">{alertRadius} km</span>
                    </div>
                    <Slider
                      value={[alertRadius]}
                      onValueChange={(value) => setAlertRadius(value[0])}
                      min={5}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>5 km</span>
                      <span>100 km</span>
                    </div>
                  </div>

                  {/* Alerts List */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {nearbyAlerts.length > 0 ? (
                      nearbyAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-lg border ${
                            alert.priority === 'CRITICAL' ? 'bg-red-50 border-red-200' :
                            alert.priority === 'HIGH' ? 'bg-orange-50 border-orange-200' :
                            alert.priority === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant={
                              alert.priority === 'CRITICAL' ? 'destructive' :
                              alert.priority === 'HIGH' ? 'default' : 'secondary'
                            }>
                              {alert.type}
                            </Badge>
                            <span className="text-xs text-gray-500">{alert.distanceKm} km</span>
                          </div>
                          <p className="text-sm font-medium">
                            {alert.sender.profile?.firstName} {alert.sender.profile?.lastName}
                          </p>
                          {alert.message && (
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{alert.message}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(alert.createdAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Shield className="h-8 w-8 mx-auto text-green-400 mb-2" />
                        <p className="text-sm text-gray-500">Няма активни алерти</p>
                        <p className="text-xs text-gray-400">в радиус {alertRadius} km</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contacts</CardTitle>
                <CardDescription>Your safety network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Phone className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Manage your emergency contacts</p>
                  <Button 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      alert('Add emergency contacts feature coming soon!');
                    }}
                  >
                    Add Contacts
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showEmergencyOptions && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowEmergencyOptions(false)}
        />
      )}

      {/* Modals */}
      <RoadsideHelpModal
        open={showRoadsideModal}
        onOpenChange={setShowRoadsideModal}
        userLocation={getUserLocation()}
        onAlertSent={() => {
          if (userCoords) {
            fetchNearbyAlerts(userCoords.lat, userCoords.lon, alertRadius)
          }
        }}
      />
      
      <EmergencyAlertModal
        open={showEmergencyModal}
        onOpenChange={setShowEmergencyModal}
        userLocation={getUserLocation()}
        onAlertSent={() => {
          if (userCoords) {
            fetchNearbyAlerts(userCoords.lat, userCoords.lon, alertRadius)
          }
        }}
      />
    </div>
  )
}
