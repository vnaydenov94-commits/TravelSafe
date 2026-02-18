
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Loader2, AlertTriangle, Users, Eye, EyeOff } from 'lucide-react'
import dynamic from 'next/dynamic'
import { EmergencyAlertModal } from './emergency-alert-modal'
import { RoadsideHelpModal } from './roadside-help-modal'
import { VehicleTypeFilter } from './vehicle-type-filter'
import { VEHICLE_TYPES } from '@/lib/vehicle-types'

// Dynamically import LeafletMap to avoid SSR issues
const LeafletMap = dynamic(
  () => import(/* webpackChunkName: "leaflet-map" */ './leaflet-map'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600 text-sm">Loading map...</div>
        </div>
      </div>
    )
  }
)

interface MapUser {
  id: string
  name: string
  vehicleType: string
  location: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
  emergencyMode?: boolean
  isVerified?: boolean
  isCurrentUser?: boolean
  lastSeen?: Date | string
  activeAlert?: {
    type: string
    message?: string
    priority: string
    createdAt: string
  } | null
}

interface ServiceProvider {
  id: string
  businessName: string
  phoneNumber: string
  email: string
  latitude: number
  longitude: number
  city?: string
  country?: string
  serviceTypes: string[]
  averageRating: number
  totalRatings: number
  is24Hours: boolean
  isVerified: boolean
  subscriptionTier: string
}

interface MapWrapperProps {
  className?: string
  height?: string
  showControls?: boolean
  showEmergencyButton?: boolean
  showFilters?: boolean
}

export function MapWrapper({ 
  className, 
  height = '100vh', 
  showControls = true,
  showEmergencyButton = true,
  showFilters = true
}: MapWrapperProps) {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [showRoadsideModal, setShowRoadsideModal] = useState(false)
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [users, setUsers] = useState<MapUser[]>([])
  const [serviceProviders, setServiceProviders] = useState<ServiceProvider[]>([])
  const [showProviders, setShowProviders] = useState(true)
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>(
    VEHICLE_TYPES.map(type => type.id) // Start with all types selected
  )
  const [isLoading, setIsLoading] = useState(true)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)

  const handleLocationUpdate = (lat: number, lng: number) => {
    setUserLocation([lat, lng])
  }

  const handleEmergencyAlert = () => {
    setShowEmergencyOptions(!showEmergencyOptions)
  }

  const handleAlertSent = () => {
    // Refresh the map to show updated emergency status
    fetchUsers()
  }

  const fetchServiceProviders = async () => {
    try {
      const params = new URLSearchParams()
      if (userLocation) {
        params.set('lat', userLocation[0].toString())
        params.set('lon', userLocation[1].toString())
        params.set('radius', '50')
      }
      const response = await fetch(`/api/service-providers?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setServiceProviders(data)
      }
    } catch (error) {
      console.error('Error fetching service providers:', error)
    }
  }

  const fetchUsers = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)
      const response = await fetch('/api/locations?type=visible&includeEmergency=true')
      if (response.ok) {
        const data = await response.json()
        const mapUsers: MapUser[] = data.locations?.map((location: any) => ({
          id: location.id,
          name: location.name,
          vehicleType: location.vehicleType,
          location: {
            latitude: location.location.latitude,
            longitude: location.location.longitude,
            city: location.location.city,
            country: location.location.country
          },
          emergencyMode: location.emergencyMode,
          isVerified: location.isVerified,
          isCurrentUser: location.isCurrentUser,
          lastSeen: location.lastSeen,
          activeAlert: location.activeAlert
        })) || []
        setUsers(mapUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(true) // Initial load with spinner
    fetchServiceProviders() // Fetch service providers
    
    // Use Server-Sent Events for real-time updates
    let eventSource: EventSource | null = null
    
    const connectSSE = () => {
      eventSource = new EventSource('/api/locations/stream')
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.locations) {
            const mapUsers: MapUser[] = data.locations.map((location: any) => ({
              id: location.id,
              name: location.name,
              vehicleType: location.vehicleType,
              location: {
                latitude: location.location.latitude,
                longitude: location.location.longitude,
                city: location.location.city,
                country: location.location.country
              },
              emergencyMode: location.emergencyMode,
              isVerified: location.isVerified,
              isCurrentUser: location.isCurrentUser,
              lastSeen: location.lastSeen,
              activeAlert: location.activeAlert
            }))
            setUsers(mapUsers)
            setIsLoading(false)
          }
        } catch (error) {
          console.error('SSE parse error:', error)
        }
      }
      
      eventSource.onerror = () => {
        // Reconnect on error
        eventSource?.close()
        setTimeout(connectSSE, 3000)
      }
    }
    
    connectSSE()
    
    // Auto-capture and save location on map load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords
          setUserLocation([latitude, longitude])
          
          // Get city and country from coordinates using reverse geocoding
          let city = null
          let country = null
          try {
            const geocodeResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=bg`
            )
            if (geocodeResponse.ok) {
              const geocodeData = await geocodeResponse.json()
              city = geocodeData.address?.city || geocodeData.address?.town || geocodeData.address?.village || geocodeData.address?.municipality || null
              country = geocodeData.address?.country || null
            }
          } catch (error) {
            console.error('Failed to reverse geocode:', error)
          }
          
          // Save location to database automatically
          try {
            await fetch('/api/locations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                latitude,
                longitude,
                accuracy,
                city,
                country
              })
            })
          } catch (error) {
            console.error('Error saving initial location:', error)
          }
        },
        (error) => {
          console.error('Error getting initial location:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    }
    
    return () => {
      eventSource?.close()
    }
  }, [])

  const filteredUsers = users.filter(user => 
    selectedVehicleTypes.length === 0 || selectedVehicleTypes.includes(user.vehicleType)
  )

  return (
    <div className={`relative ${className || ''}`} style={{ height }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading travelers...</span>
          </div>
        </div>
      )}

      {/* Map Component */}
      <LeafletMap 
        users={filteredUsers}
        serviceProviders={serviceProviders}
        center={userLocation || undefined}
        vehicleTypeFilter={selectedVehicleTypes}
        showProviders={showProviders}
      />
      
      {/* Vehicle Type Filters */}
      {showFilters && (
        <div className="absolute top-6 right-6 z-[1000] max-w-sm">
          <VehicleTypeFilter
            selectedTypes={selectedVehicleTypes}
            onSelectionChange={setSelectedVehicleTypes}
          />
        </div>
      )}

      {/* User Statistics */}
      <div className="absolute top-6 left-6 z-[1000]">
        <Card className="shadow-md">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{filteredUsers.length} пътници</span>
            </div>
            {serviceProviders.length > 0 && (
              <button
                onClick={() => setShowProviders(!showProviders)}
                className={`flex items-center gap-2 text-sm ${showProviders ? 'text-green-600' : 'text-gray-400'}`}
              >
                <span className="text-base">🔧</span>
                <span>{serviceProviders.length} доставчици</span>
                {showProviders ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map Controls */}
      {showControls && (
        <div className="absolute bottom-6 left-6 z-[1000]">
          <Card className="shadow-md">
            <CardContent className="p-3">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude, accuracy } = position.coords
                          setUserLocation([latitude, longitude])
                          handleLocationUpdate(latitude, longitude)
                          
                          // Get city and country from coordinates using reverse geocoding
                          let city = null
                          let country = null
                          try {
                            const geocodeResponse = await fetch(
                              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=bg`
                            )
                            if (geocodeResponse.ok) {
                              const geocodeData = await geocodeResponse.json()
                              city = geocodeData.address?.city || geocodeData.address?.town || geocodeData.address?.village || geocodeData.address?.municipality || null
                              country = geocodeData.address?.country || null
                            }
                          } catch (error) {
                            console.error('Failed to reverse geocode:', error)
                          }
                          
                          // Save location to database
                          try {
                            await fetch('/api/locations', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json'
                              },
                              body: JSON.stringify({
                                latitude,
                                longitude,
                                accuracy,
                                city,
                                country
                              })
                            })
                            // Refresh users to show yourself on map
                            fetchUsers()
                          } catch (error) {
                            console.error('Error saving location:', error)
                          }
                        },
                        (error) => {
                          console.error('Error getting location:', error)
                        }
                      )
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  My Location
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchUsers()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Emergency Button - Fixed position with dropdown */}
      {showEmergencyButton && (
        <div className="absolute bottom-6 right-6 z-[1000]">
          <div className="relative">
            <Card className="shadow-lg border-red-200">
              <CardContent className="p-3">
                <Button
                  onClick={handleEmergencyAlert}
                  className="bg-red-700 hover:bg-red-800 text-white font-semibold px-4 py-2"
                  size="sm"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Emergency Alert
                </Button>
              </CardContent>
            </Card>
            
            {/* Dropdown Options */}
            {showEmergencyOptions && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border z-[1001] overflow-hidden min-w-[220px]">
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
        </div>
      )}
      
      {/* Emergency Alert Modal */}
      <EmergencyAlertModal
        open={showEmergencyModal}
        onOpenChange={setShowEmergencyModal}
        userLocation={userLocation}
        onAlertSent={handleAlertSent}
      />
      
      {/* Roadside Help Modal */}
      <RoadsideHelpModal
        open={showRoadsideModal}
        onOpenChange={setShowRoadsideModal}
        userLocation={userLocation}
        onAlertSent={handleAlertSent}
      />
    </div>
  )
}
