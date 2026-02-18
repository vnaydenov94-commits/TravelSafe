
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { getVehicleTypeById } from '@/lib/vehicle-types'
import { FallbackMap } from './fallback-map'

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
}

interface GoogleMapProps {
  users?: MapUser[]
  center?: [number, number]
  zoom?: number
  vehicleTypeFilter?: string[]
}

export function GoogleMap({ 
  users = [], 
  center = [42.7339, 25.4858], // Default to Bulgaria center
  zoom = 6,
  vehicleTypeFilter = []
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          setError('Google Maps API key not configured')
          return
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        await loader.load()
        setIsLoaded(true)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
        
        // Handle specific Google Maps errors
        if (error instanceof Error) {
          if (error.message.includes('BillingNotEnabledMapError')) {
            setError('Google Maps requires billing to be enabled. Please configure a valid API key.')
          } else if (error.message.includes('ApiNotActivatedMapError')) {
            setError('Google Maps API is not activated. Please enable it in Google Cloud Console.')  
          } else if (error.message.includes('InvalidKeyMapError')) {
            setError('Invalid Google Maps API key.')
          } else {
            setError(`Failed to load Google Maps: ${error.message}`)
          }
        } else {
          setError('Failed to load Google Maps. Please check your internet connection.')
        }
      }
    }

    initMap()
  }, [])

  // Create custom marker for vehicle type
  const createVehicleMarker = useCallback((user: MapUser, map: google.maps.Map) => {
    const vehicleType = getVehicleTypeById(user.vehicleType)
    const color = vehicleType ? vehicleType.color : '#3B82F6'
    
    // Create custom SVG icon
    const svgIcon = {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="3"/>
          <text x="16" y="20" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="10" font-weight="bold">
            ${vehicleType?.name?.charAt(0) || 'T'}
          </text>
        </svg>
      `)}`,
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16)
    }

    const marker = new google.maps.Marker({
      position: { lat: user.location.latitude, lng: user.location.longitude },
      map: map,
      title: user.name,
      icon: svgIcon
    })

    // Create info window content
    const infoWindowContent = `
      <div style="min-width: 200px; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">
          ${user.name}
          ${user.isVerified ? '<span style="color: #10b981; margin-left: 4px;">✓</span>' : ''}
        </h3>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <span style="color: ${color}; font-weight: bold; margin-right: 8px;">●</span>
          <span style="color: #6b7280; font-size: 14px;">
            ${vehicleType ? vehicleType.name : 'Unknown vehicle'}
          </span>
        </div>
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
          📍 ${user.location.city ? `${user.location.city}, ` : ''}${user.location.country || 'Unknown location'}
        </div>
        ${user.emergencyMode ? 
          '<div style="color: #ef4444; font-size: 14px; font-weight: bold;">🚨 Emergency Mode Active</div>' : 
          ''
        }
      </div>
    `

    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContent
    })

    marker.addListener('click', () => {
      // Close other info windows
      markersRef.current.forEach(m => {
        if ((m as any).infoWindow) {
          (m as any).infoWindow.close()
        }
      })
      
      infoWindow.open(map, marker)
    })

    // Store info window reference
    ;(marker as any).infoWindow = infoWindow

    return marker
  }, [])

  // Create or update map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return

    // Initialize map if not exists
    if (!googleMapRef.current) {
      googleMapRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: [
          // Custom styling for better visibility
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
          }
        ]
      })
    }

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.setMap(null)
    })
    markersRef.current = []

    // Add new markers
    const filteredUsers = users.filter(user => 
      vehicleTypeFilter.length === 0 || vehicleTypeFilter.includes(user.vehicleType)
    )

    const newMarkers: google.maps.Marker[] = []
    const bounds = new google.maps.LatLngBounds()

    filteredUsers.forEach(user => {
      const marker = createVehicleMarker(user, googleMapRef.current!)
      newMarkers.push(marker)
      bounds.extend(new google.maps.LatLng(user.location.latitude, user.location.longitude))
    })

    markersRef.current = newMarkers

    // Fit map to show all markers if we have users
    if (filteredUsers.length > 0) {
      googleMapRef.current.fitBounds(bounds)
      
      // Don't zoom in too much for a single marker
      if (filteredUsers.length === 1) {
        const listener = google.maps.event.addListenerOnce(googleMapRef.current, 'bounds_changed', () => {
          if (googleMapRef.current!.getZoom()! > 15) {
            googleMapRef.current!.setZoom(15)
          }
        })
      }
    }

  }, [isLoaded, users, center, zoom, vehicleTypeFilter, createVehicleMarker])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(marker => {
        marker.setMap(null)
      })
    }
  }, [])

  if (error) {
    return (
      <div className="h-full w-full relative">
        {/* Error notification */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Google Maps unavailable - showing alternative view
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Fallback Map */}
        <FallbackMap users={users} vehicleTypeFilter={vehicleTypeFilter} />
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600 text-sm">Loading map...</div>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapRef}
      className="h-full w-full"
      style={{ 
        minHeight: '400px',
        backgroundColor: '#f0f0f0'
      }}
    />
  )
}
