'use client'

import { useEffect, useRef, useState } from 'react'
import { getVehicleTypeById, getVehicleTypeEmoji } from '@/lib/vehicle-types'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

interface LeafletMapProps {
  users?: MapUser[]
  serviceProviders?: ServiceProvider[]
  center?: [number, number]
  zoom?: number
  vehicleTypeFilter?: string[]
  showProviders?: boolean
}

// Helper function to check if user is online (active in last 5 minutes)
function isUserOnline(lastSeen?: Date | string): boolean {
  if (!lastSeen) return false
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen
  const now = new Date()
  const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60)
  return diffMinutes < 5
}

// Helper function to format last seen time
function formatLastSeen(lastSeen?: Date | string): string {
  if (!lastSeen) return 'Никога'
  
  const lastSeenDate = typeof lastSeen === 'string' ? new Date(lastSeen) : lastSeen
  const now = new Date()
  const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))
  
  if (diffMinutes < 1) return 'Току-що'
  if (diffMinutes < 60) return `Преди ${diffMinutes} мин`
  
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Преди ${diffHours} ${diffHours === 1 ? 'час' : 'часа'}`
  
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `Преди ${diffDays} ${diffDays === 1 ? 'ден' : 'дни'}`
  
  // Format as date for older timestamps
  return lastSeenDate.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' })
}



function LeafletMap({ 
  users = [], 
  serviceProviders = [],
  center = [42.7339, 25.4858], // Default to Bulgaria center
  zoom = 7,
  vehicleTypeFilter = [],
  showProviders = true
}: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<Map<string, L.Marker>>(new Map())
  const providerMarkersRef = useRef<Map<string, L.Marker>>(new Map())
  const openPopupUserIdRef = useRef<string | null>(null)
  const frozenUserDataRef = useRef<MapUser[]>([]) // Store frozen data for all users in open popup
  const frozenGroupKeyRef = useRef<string | null>(null) // Track which group has frozen data
  const [isLoaded, setIsLoaded] = useState(false)
  const hasInitialFit = useRef(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    try {
      // Create map instance
      const map = L.map(mapRef.current, {
        center: [center[0], center[1]],
        zoom: zoom,
        zoomControl: true,
        scrollWheelZoom: true
      })

      // Add OpenStreetMap tiles - Free and open source  
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 3
      }).addTo(map)

      mapInstanceRef.current = map
      
      setIsLoaded(true)
    } catch (err) {
      console.error('Failed to initialize map:', err)
    }

    // Cleanup
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when users change
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return

    const map = mapInstanceRef.current

    // Filter users
    const filteredUsers = users.filter(user => 
      vehicleTypeFilter.length === 0 || vehicleTypeFilter.includes(user.vehicleType)
    )

    // Helper function to group nearby users
    // Each user gets their own marker - no grouping
    const groupNearbyUsers = (usersList: typeof filteredUsers) => {
      // Return each user as a single-element group
      return usersList.map(user => [user])
    }

    // Track which users are currently visible
    const currentUserIds = new Set(filteredUsers.map(u => u.id))
    
    // Remove markers for users that are no longer visible
    markersRef.current.forEach((marker, userId) => {
      if (!currentUserIds.has(userId)) {
        map.removeLayer(marker)
        markersRef.current.delete(userId)
      }
    })
    
    // Group nearby users
    const userGroups = groupNearbyUsers(filteredUsers)
    
    // Add new markers or update existing ones
    const bounds: L.LatLngBounds | null = filteredUsers.length > 0 ? L.latLngBounds([]) : null

    userGroups.forEach(group => {
      // Use the first user's coordinates for the group marker
      const primaryUser = group[0]
      const lat = primaryUser.location.latitude
      const lng = primaryUser.location.longitude
      
      const groupKey = group.map(u => u.id).sort().join('-')

      // Check if this group has frozen data (popup is open)
      const hasFrozenData = frozenGroupKeyRef.current === groupKey
      
      // If popup is open for this group, use frozen data instead of live data
      const displayGroup = hasFrozenData ? frozenUserDataRef.current : group
      
      // Helper function to get alert color based on priority
      const getAlertColor = (priority: string): string => {
        switch (priority) {
          case 'CRITICAL': return '#dc2626' // red
          case 'HIGH': return '#ea580c'     // orange
          case 'MEDIUM': return '#eab308'   // yellow
          case 'LOW': return '#22c55e'      // green
          default: return '#ef4444'         // default red
        }
      }
      
      // Determine marker style based on group size
      let iconHtml = ''
      let markerSize = 40
      
      if (displayGroup.length === 1) {
        // Single user - regular circular marker
        const user = displayGroup[0]
        const vehicleType = getVehicleTypeById(user.vehicleType)
        const color = vehicleType ? vehicleType.color : '#3B82F6'
        const isCurrentUser = user.isCurrentUser || false
        markerSize = isCurrentUser ? 44 : 32
        const borderColor = isCurrentUser ? '#2563EB' : 'white'
        const borderWidth = isCurrentUser ? 4 : 3
        const boxShadow = isCurrentUser 
          ? '0 0 0 4px rgba(37, 99, 235, 0.3), 0 4px 8px rgba(0,0,0,0.3)'
          : '0 2px 4px rgba(0,0,0,0.3)'
        const vehicleEmoji = getVehicleTypeEmoji(user.vehicleType)
        
        // Check for active alert
        const hasAlert = !!user.activeAlert
        const alertColor = hasAlert ? getAlertColor(user.activeAlert!.priority) : ''

        iconHtml = hasAlert ? `
          <div style="
            position: relative;
            width: ${markerSize + 16}px;
            height: ${markerSize + 16}px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Pulsing alert ring -->
            <div style="
              position: absolute;
              width: ${markerSize + 16}px;
              height: ${markerSize + 16}px;
              border-radius: 50%;
              background-color: ${alertColor};
              animation: pulse-alert 2s ease-in-out infinite;
            "></div>
            <!-- Main marker -->
            <div style="
              position: relative;
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              background-color: ${color};
              border: ${borderWidth}px solid ${borderColor};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: ${boxShadow};
              font-weight: bold;
              color: white;
              font-size: ${isCurrentUser ? '20px' : '18px'};
              z-index: 1;
              ${isCurrentUser ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}
            ">
              ${isCurrentUser ? '👤' : vehicleEmoji}
            </div>
          </div>
        ` : `
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            background-color: ${color};
            border: ${borderWidth}px solid ${borderColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${boxShadow};
            font-weight: bold;
            color: white;
            font-size: ${isCurrentUser ? '20px' : '18px'};
            ${isCurrentUser ? 'animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;' : ''}
          ">
            ${isCurrentUser ? '👤' : vehicleEmoji}
          </div>
        `
      } else if (displayGroup.length === 2) {
        // Exactly 2 users - one larger circle with both emojis side by side
        markerSize = 56
        const user1 = displayGroup[0]
        const user2 = displayGroup[1]
        const vehicleType1 = getVehicleTypeById(user1.vehicleType)
        const vehicleType2 = getVehicleTypeById(user2.vehicleType)
        const color1 = vehicleType1 ? vehicleType1.color : '#3B82F6'
        const color2 = vehicleType2 ? vehicleType2.color : '#3B82F6'
        const emoji1 = getVehicleTypeEmoji(user1.vehicleType)
        const emoji2 = getVehicleTypeEmoji(user2.vehicleType)
        
        // Check if any user has an active alert (use highest priority)
        const alerts = displayGroup.filter(u => u.activeAlert).map(u => u.activeAlert!)
        const hasAlert = alerts.length > 0
        const alertColor = hasAlert ? getAlertColor(
          alerts.find(a => a.priority === 'CRITICAL')?.priority ||
          alerts.find(a => a.priority === 'HIGH')?.priority ||
          alerts.find(a => a.priority === 'MEDIUM')?.priority ||
          alerts[0].priority
        ) : ''

        iconHtml = hasAlert ? `
          <div style="
            position: relative;
            width: ${markerSize + 16}px;
            height: ${markerSize + 16}px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Pulsing alert ring -->
            <div style="
              position: absolute;
              width: ${markerSize + 16}px;
              height: ${markerSize + 16}px;
              border-radius: 50%;
              background-color: ${alertColor};
              animation: pulse-alert 2s ease-in-out infinite;
            "></div>
            <!-- Main marker -->
            <div style="
              position: relative;
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              background: linear-gradient(90deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%);
              border: 3px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              font-size: 18px;
              font-weight: bold;
              z-index: 1;
            ">
              <span style="
                z-index: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              ">${emoji1}</span>
              <span style="
                width: 2px;
                height: ${markerSize - 12}px;
                background: white;
                opacity: 0.7;
                border-radius: 1px;
              "></span>
              <span style="
                z-index: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              ">${emoji2}</span>
            </div>
          </div>
        ` : `
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            border-radius: 50%;
            background: linear-gradient(90deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%);
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 2px;
            box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            font-size: 18px;
            font-weight: bold;
            position: relative;
          ">
            <span style="
              z-index: 1;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">${emoji1}</span>
            <span style="
              width: 2px;
              height: ${markerSize - 12}px;
              background: white;
              opacity: 0.7;
              border-radius: 1px;
            "></span>
            <span style="
              z-index: 1;
              text-shadow: 0 1px 2px rgba(0,0,0,0.5);
            ">${emoji2}</span>
          </div>
        `
      } else {
        // 3+ users - larger circle with first 2 emojis + counter badge
        markerSize = 56
        const usersToShow = displayGroup.slice(0, 2)
        const extraCount = displayGroup.length - 2
        const user1 = usersToShow[0]
        const user2 = usersToShow[1]
        const vehicleType1 = getVehicleTypeById(user1.vehicleType)
        const vehicleType2 = getVehicleTypeById(user2.vehicleType)
        const color1 = vehicleType1 ? vehicleType1.color : '#3B82F6'
        const color2 = vehicleType2 ? vehicleType2.color : '#3B82F6'
        const emoji1 = getVehicleTypeEmoji(user1.vehicleType)
        const emoji2 = getVehicleTypeEmoji(user2.vehicleType)
        
        // Check if any user has an active alert (use highest priority)
        const alerts = displayGroup.filter(u => u.activeAlert).map(u => u.activeAlert!)
        const hasAlert = alerts.length > 0
        const alertColor = hasAlert ? getAlertColor(
          alerts.find(a => a.priority === 'CRITICAL')?.priority ||
          alerts.find(a => a.priority === 'HIGH')?.priority ||
          alerts.find(a => a.priority === 'MEDIUM')?.priority ||
          alerts[0].priority
        ) : ''

        iconHtml = hasAlert ? `
          <div style="
            position: relative;
            width: ${markerSize + 16}px;
            height: ${markerSize + 16}px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <!-- Pulsing alert ring -->
            <div style="
              position: absolute;
              width: ${markerSize + 16}px;
              height: ${markerSize + 16}px;
              border-radius: 50%;
              background-color: ${alertColor};
              animation: pulse-alert 2s ease-in-out infinite;
            "></div>
            <!-- Main marker container -->
            <div style="
              position: relative;
              width: ${markerSize}px;
              height: ${markerSize}px;
              z-index: 1;
            ">
              <div style="
                width: ${markerSize}px;
                height: ${markerSize}px;
                border-radius: 50%;
                background: linear-gradient(90deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%);
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 2px;
                box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                font-size: 18px;
                font-weight: bold;
              ">
                <span style="
                  z-index: 1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                ">${emoji1}</span>
                <span style="
                  width: 2px;
                  height: ${markerSize - 12}px;
                  background: white;
                  opacity: 0.7;
                  border-radius: 1px;
                "></span>
                <span style="
                  z-index: 1;
                  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                ">${emoji2}</span>
              </div>
              <div style="
                position: absolute;
                bottom: -6px;
                right: -6px;
                width: 24px;
                height: 24px;
                background: #ef4444;
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
                color: white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.4);
              ">+${extraCount}</div>
            </div>
          </div>
        ` : `
          <div style="
            position: relative;
            width: ${markerSize}px;
            height: ${markerSize}px;
          ">
            <div style="
              width: ${markerSize}px;
              height: ${markerSize}px;
              border-radius: 50%;
              background: linear-gradient(90deg, ${color1} 0%, ${color1} 50%, ${color2} 50%, ${color2} 100%);
              border: 3px solid white;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
              font-size: 18px;
              font-weight: bold;
            ">
              <span style="
                z-index: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              ">${emoji1}</span>
              <span style="
                width: 2px;
                height: ${markerSize - 12}px;
                background: white;
                opacity: 0.7;
                border-radius: 1px;
              "></span>
              <span style="
                z-index: 1;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5);
              ">${emoji2}</span>
            </div>
            <div style="
              position: absolute;
              bottom: -6px;
              right: -6px;
              width: 24px;
              height: 24px;
              background: #ef4444;
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              color: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.4);
            ">+${extraCount}</div>
          </div>
        `
      }

      // Adjust icon size if there's an alert ring
      const hasAnyAlert = displayGroup.some(u => u.activeAlert)
      const iconDisplaySize = hasAnyAlert ? markerSize + 16 : markerSize
      
      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker',
        iconSize: [iconDisplaySize, iconDisplaySize],
        iconAnchor: [iconDisplaySize / 2, iconDisplaySize / 2],
        popupAnchor: [0, -iconDisplaySize / 2]
      })

      // Check if marker already exists for this group
      let marker = markersRef.current.get(groupKey)
      const existingMarker = !!marker

      // Update existing marker or create new one
      if (existingMarker && marker) {
        // If popup is open for this marker, skip ALL updates to preserve frozen state
        if (hasFrozenData) {
          console.log('⏸️ Пропускане на обновлението - попъпът е отворен за:', groupKey)
          if (bounds) bounds.extend([lat, lng])
          return // Skip all updates - preserve frozen popup
        }
        
        // Update position and icon of existing marker (popup is closed)
        marker.setLatLng([lat, lng])
        marker.setIcon(customIcon)
        // No need to recreate popup or event listeners
      } else {
        // Create new marker with exact position
        marker = L.marker(
          [lat, lng],
          { icon: customIcon }
        )

        // Create popup content as DOM element for interactivity
        const popupContainer = document.createElement('div')
        popupContainer.style.cssText = 'min-width: 220px; max-width: 320px; font-family: Arial, sans-serif;'
        
        // Format alert type for display
        const getAlertTypeDisplay = (type: string) => {
          const types: Record<string, { emoji: string; label: string }> = {
            'FLAT_TYRE': { emoji: '🛞', label: 'Спукана гума' },
            'BATTERY_JUMP': { emoji: '🔋', label: 'Изтощена батерия' },
            'OUT_OF_FUEL': { emoji: '⛽', label: 'Без гориво' },
            'NEED_TOWING': { emoji: '🚗', label: 'Нужда от пътна помощ' },
            'OTHER_ROADSIDE': { emoji: '🚧', label: 'Друга пътна помощ' },
            'MEDICAL': { emoji: '🏥', label: 'Медицинска помощ' },
            'SAFETY': { emoji: '⚠️', label: 'Безопасност' },
            'VEHICLE': { emoji: '🚗', label: 'Проблем с превозното средство' },
            'OTHER': { emoji: '🆘', label: 'Друга спешност' }
          }
          return types[type] || { emoji: '🆘', label: type }
        }

        const getPriorityColor = (priority: string) => {
          switch (priority) {
            case 'CRITICAL': return '#dc2626'
            case 'HIGH': return '#ea580c'
            case 'MEDIUM': return '#eab308'
            case 'LOW': return '#22c55e'
            default: return '#ef4444'
          }
        }

        let profileHTML = ''
        
        if (displayGroup.length === 1) {
          // Single user popup - using frozen or live data
          const user = displayGroup[0]
          const vehicleType = getVehicleTypeById(user.vehicleType)
          const color = vehicleType ? vehicleType.color : '#3B82F6'
          const isCurrentUser = user.isCurrentUser || false
          const online = isUserOnline(user.lastSeen)
          const lastSeenText = formatLastSeen(user.lastSeen)
          const alertDisplay = user.activeAlert ? getAlertTypeDisplay(user.activeAlert.type) : null
          const alertTime = user.activeAlert ? new Date(user.activeAlert.createdAt).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }) : ''

          profileHTML = `
            <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937; display: flex; align-items: center; gap: 8px;">
              <span>${user.name}</span>
              ${isCurrentUser ? '<span style="background: #2563EB; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Ти</span>' : ''}
              ${user.isVerified ? '<span style="color: #10b981;">✓</span>' : ''}
            </h3>
            <div style="display: flex; align-items: center; margin-bottom: 8px; gap: 6px;">
              <div style="
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${online ? '#10b981' : '#9ca3af'};
                ${online ? 'box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3); animation: pulse-dot 2s infinite;' : ''}
              "></div>
              <span style="color: ${online ? '#10b981' : '#6b7280'}; font-size: 13px; font-weight: 600;">
                ${online ? 'На линия' : lastSeenText}
              </span>
            </div>
            <div style="display: flex; align-items: center; margin-bottom: 4px;">
              <span style="color: ${color}; font-weight: bold; margin-right: 8px;">●</span>
              <span style="color: #6b7280; font-size: 14px;">
                ${vehicleType ? vehicleType.name : 'Unknown vehicle'}
              </span>
            </div>
            <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">
              📍 ${user.location.city ? `${user.location.city}, ` : ''}${user.location.country || 'Unknown location'}
            </div>
            ${user.activeAlert ? `
              <div style="
                margin-top: 10px;
                padding: 10px;
                background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
                border: 1px solid #fca5a5;
                border-radius: 8px;
                border-left: 4px solid ${getPriorityColor(user.activeAlert.priority)};
              ">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <span style="font-size: 18px;">${alertDisplay?.emoji}</span>
                  <span style="font-weight: bold; color: #dc2626; font-size: 14px;">${alertDisplay?.label}</span>
                </div>
                ${user.activeAlert.message ? `
                  <div style="color: #7f1d1d; font-size: 13px; margin-bottom: 6px; padding: 6px; background: white; border-radius: 4px;">
                    "${user.activeAlert.message}"
                  </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="
                    font-size: 11px;
                    padding: 2px 8px;
                    border-radius: 10px;
                    background: ${getPriorityColor(user.activeAlert.priority)};
                    color: white;
                    font-weight: 600;
                  ">${user.activeAlert.priority}</span>
                  <span style="color: #9ca3af; font-size: 11px;">🕐 ${alertTime}</span>
                </div>
              </div>
            ` : (user.emergencyMode ? 
              '<div style="color: #ef4444; font-size: 14px; font-weight: bold; margin-top: 8px;">🚨 Emergency Mode Active</div>' : 
              ''
            )}
            ${isCurrentUser ? 
              '<div style="color: #2563EB; font-size: 12px; margin-top: 8px; font-style: italic;">Това е твоята текуща локация</div>' : 
              ''
            }
          `
        } else {
          // Multiple users popup - using frozen or live data
          profileHTML = `
            <div style="margin-bottom: 8px;">
              <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: bold;">
                👥 ${displayGroup.length} потребители на това място
              </h4>
            </div>
            ${displayGroup.map(user => {
              const vehicleType = getVehicleTypeById(user.vehicleType)
              const color = vehicleType ? vehicleType.color : '#3B82F6'
              const isCurrentUser = user.isCurrentUser || false
              const online = isUserOnline(user.lastSeen)
              const vehicleEmoji = getVehicleTypeEmoji(user.vehicleType)
              
              return `
                <div style="
                  margin-bottom: 10px;
                  padding: 8px;
                  background: #f9fafb;
                  border-radius: 6px;
                  border-left: 3px solid ${color};
                ">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 18px;">${vehicleEmoji}</span>
                    <span style="font-weight: bold; color: #1f2937; font-size: 13px;">${user.name}</span>
                    ${isCurrentUser ? '<span style="background: #2563EB; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; margin-left: 4px;">Ти</span>' : ''}
                    ${user.isVerified ? '<span style="color: #10b981; font-size: 14px;">✓</span>' : ''}
                  </div>
                  <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280;">
                    <div style="
                      width: 6px;
                      height: 6px;
                      border-radius: 50%;
                      background: ${online ? '#10b981' : '#9ca3af'};
                    "></div>
                    <span>${online ? 'На линия' : 'Офлайн'}</span>
                  </div>
                </div>
              `
            }).join('')}
          `
        }
        
        popupContainer.innerHTML = profileHTML
        
        // Add "Send Message" and "Wave" buttons - using frozen or live data
        const nonCurrentUsers = displayGroup.filter(u => !u.isCurrentUser)
        if (nonCurrentUsers.length > 0) {
          if (displayGroup.length === 1) {
            // Single user - buttons in a row
            const user = displayGroup[0]
            
            // Create buttons container
            const buttonsRow = document.createElement('div')
            buttonsRow.style.cssText = `
              margin-top: 12px;
              display: flex;
              gap: 8px;
            `
            
            // Wave button
            const waveButton = document.createElement('button')
            waveButton.innerHTML = '👋'
            waveButton.style.cssText = `
              padding: 8px 16px;
              background: #fbbf24;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 20px;
              cursor: pointer;
              transition: all 0.2s;
              flex-shrink: 0;
            `
            
            waveButton.onmouseenter = () => {
              waveButton.style.background = '#f59e0b'
              waveButton.style.transform = 'scale(1.1)'
            }
            waveButton.onmouseleave = () => {
              waveButton.style.background = '#fbbf24'
              waveButton.style.transform = 'scale(1)'
            }
            
            waveButton.onclick = async (e) => {
              e.preventDefault()
              e.stopPropagation()
              waveButton.disabled = true
              const originalContent = waveButton.innerHTML
              waveButton.innerHTML = '⏳'
              
              try {
                const response = await fetch('/api/wave', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    targetUserId: user.id
                  })
                })
                
                if (response.ok) {
                  waveButton.innerHTML = '✓'
                  waveButton.style.background = '#10b981'
                  setTimeout(() => {
                    waveButton.innerHTML = originalContent
                    waveButton.style.background = '#fbbf24'
                    waveButton.disabled = false
                  }, 2000)
                } else {
                  // Guests (read-only map) are sent to sign-in for social actions
                  if (response.status === 401) {
                    window.location.href = '/auth/signin'
                    return
                  }
                  const error = await response.json()
                  alert(`Грешка: ${error.error || 'Неуспешно изпращане'}`)
                  waveButton.disabled = false
                  waveButton.innerHTML = originalContent
                }
              } catch (error) {
                console.error('Error sending wave:', error)
                alert('Грешка при изпращане. Моля опитайте отново.')
                waveButton.disabled = false
                waveButton.innerHTML = originalContent
              }
            }
            
            // Message button
            const messageButton = document.createElement('button')
            messageButton.innerHTML = '💬 Изпрати съобщение'
            messageButton.style.cssText = `
              flex: 1;
              padding: 8px 16px;
              background: #2563EB;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: background 0.2s;
            `
            
            messageButton.onmouseenter = () => {
              messageButton.style.background = '#1d4ed8'
            }
            messageButton.onmouseleave = () => {
              messageButton.style.background = '#2563EB'
            }
            
            messageButton.onclick = async (e) => {
              e.preventDefault()
              e.stopPropagation()
              messageButton.disabled = true
              messageButton.innerHTML = '⏳ Свързване...'
              
              try {
                const response = await fetch('/api/connections', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    receiverId: user.id,
                    message: 'Connection request from map'
                  })
                })
                
                if (response.ok) {
                  window.location.href = `/chat?userId=${user.id}`
                } else {
                  // Guests (read-only map) are sent to sign-in for social actions
                  if (response.status === 401) {
                    window.location.href = '/auth/signin'
                    return
                  }
                  const error = await response.json()
                  alert(`Грешка: ${error.error || 'Неуспешно свързване'}`)
                  messageButton.disabled = false
                  messageButton.innerHTML = '💬 Изпрати съобщение'
                }
              } catch (error) {
                console.error('Error creating connection:', error)
                alert('Грешка при свързване. Моля опитайте отново.')
                messageButton.disabled = false
                messageButton.innerHTML = '💬 Изпрати съобщение'
              }
            }
            
            buttonsRow.appendChild(waveButton)
            buttonsRow.appendChild(messageButton)
            popupContainer.appendChild(buttonsRow)
          } else {
            // Multiple users - buttons for each (Wave + Message)
            const buttonsContainer = document.createElement('div')
            buttonsContainer.style.cssText = 'margin-top: 12px; display: flex; flex-direction: column; gap: 6px;'
            
            nonCurrentUsers.forEach(user => {
              // Create row for each user with Wave + Message buttons
              const userButtonsRow = document.createElement('div')
              userButtonsRow.style.cssText = 'display: flex; gap: 6px;'
              
              // Wave button
              const waveButton = document.createElement('button')
              waveButton.innerHTML = '👋'
              waveButton.style.cssText = `
                padding: 6px 12px;
                background: #fbbf24;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.2s;
                flex-shrink: 0;
              `
              
              waveButton.onmouseenter = () => {
                waveButton.style.background = '#f59e0b'
                waveButton.style.transform = 'scale(1.1)'
              }
              waveButton.onmouseleave = () => {
                waveButton.style.background = '#fbbf24'
                waveButton.style.transform = 'scale(1)'
              }
              
              waveButton.onclick = async (e) => {
                e.preventDefault()
                e.stopPropagation()
                waveButton.disabled = true
                const originalContent = waveButton.innerHTML
                waveButton.innerHTML = '⏳'
                
                try {
                  const response = await fetch('/api/wave', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      targetUserId: user.id
                    })
                  })
                  
                  if (response.ok) {
                    waveButton.innerHTML = '✓'
                    waveButton.style.background = '#10b981'
                    setTimeout(() => {
                      waveButton.innerHTML = originalContent
                      waveButton.style.background = '#fbbf24'
                      waveButton.disabled = false
                    }, 2000)
                  } else {
                    // Guests (read-only map) are sent to sign-in for social actions
                    if (response.status === 401) {
                      window.location.href = '/auth/signin'
                      return
                    }
                    const error = await response.json()
                    alert(`Грешка: ${error.error || 'Неуспешно изпращане'}`)
                    waveButton.disabled = false
                    waveButton.innerHTML = originalContent
                  }
                } catch (error) {
                  console.error('Error sending wave:', error)
                  alert('Грешка при изпращане. Моля опитайте отново.')
                  waveButton.disabled = false
                  waveButton.innerHTML = originalContent
                }
              }
              
              // Message button
              const messageButton = document.createElement('button')
              messageButton.innerHTML = `💬 Съобщение до ${user.name}`
              messageButton.style.cssText = `
                flex: 1;
                padding: 6px 12px;
                background: #2563EB;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
              `
              
              messageButton.onmouseenter = () => {
                messageButton.style.background = '#1d4ed8'
              }
              messageButton.onmouseleave = () => {
                messageButton.style.background = '#2563EB'
              }
              
              messageButton.onclick = async (e) => {
                e.preventDefault()
                e.stopPropagation()
                messageButton.disabled = true
                messageButton.innerHTML = '⏳ Свързване...'
                
                try {
                  const response = await fetch('/api/connections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      receiverId: user.id,
                      message: 'Connection request from map'
                    })
                  })
                  
                  if (response.ok) {
                    window.location.href = `/chat?userId=${user.id}`
                  } else {
                    // Guests (read-only map) are sent to sign-in for social actions
                    if (response.status === 401) {
                      window.location.href = '/auth/signin'
                      return
                    }
                    const error = await response.json()
                    alert(`Грешка: ${error.error || 'Неуспешно свързване'}`)
                    messageButton.disabled = false
                    messageButton.innerHTML = `💬 Съобщение до ${user.name}`
                  }
                } catch (error) {
                  console.error('Error creating connection:', error)
                  alert('Грешка при свързване. Моля опитайте отново.')
                  messageButton.disabled = false
                  messageButton.innerHTML = `💬 Съобщение до ${user.name}`
                }
              }
              
              userButtonsRow.appendChild(waveButton)
              userButtonsRow.appendChild(messageButton)
              buttonsContainer.appendChild(userButtonsRow)
            })
            
            popupContainer.appendChild(buttonsContainer)
          }
        }

        // Bind popup with options - stays open until click elsewhere or close button
        marker.bindPopup(popupContainer, {
          closeOnClick: true,     // Close when clicking elsewhere on map
          autoClose: true,        // Close when opening another popup
          closeButton: true,      // Show close button
          maxWidth: 320,
          minWidth: 220
        })
        
        // Track which popup is open and freeze the data
        marker.on('popupopen', () => {
          // Store the first user ID from the group to track which popup is open
          openPopupUserIdRef.current = group[0].id
          
          // Freeze the entire group data - deep copy to prevent reference issues
          frozenUserDataRef.current = group.map(user => ({
            ...user,
            location: { ...user.location },
            activeAlert: user.activeAlert ? { ...user.activeAlert } : null
          }))
          
          // Store which group has frozen data
          frozenGroupKeyRef.current = groupKey
          
          console.log('🔒 Замразени данни за група:', groupKey, frozenUserDataRef.current.length, 'потребителя')
        })
        
        marker.on('popupclose', () => {
          // Clear frozen data and allow updates
          if (openPopupUserIdRef.current === group[0].id) {
            console.log('🔓 Освобождаване на замразени данни за група:', frozenGroupKeyRef.current)
            openPopupUserIdRef.current = null
            frozenUserDataRef.current = []
            frozenGroupKeyRef.current = null
          }
        })
        
        // Store marker reference using group key
        markersRef.current.set(groupKey, marker)
        
        // Add marker directly to map (no clustering)
        marker.addTo(map)
      }

      if (bounds) {
        bounds.extend([lat, lng])
      }
    })

    // Fit map to show all markers only on first load
    if (bounds && bounds.isValid() && !hasInitialFit.current) {
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 12
      })
      hasInitialFit.current = true
    }

  }, [users, vehicleTypeFilter, isLoaded])

  // Update service provider markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !showProviders) return

    const map = mapInstanceRef.current

    // Track current provider IDs
    const currentProviderIds = new Set(serviceProviders.map(p => p.id))
    
    // Remove markers for providers that are no longer visible
    providerMarkersRef.current.forEach((marker, providerId) => {
      if (!currentProviderIds.has(providerId)) {
        map.removeLayer(marker)
        providerMarkersRef.current.delete(providerId)
      }
    })

    // Service type icons mapping
    const getServiceIcon = (serviceTypes: string[]): string => {
      if (serviceTypes.includes('TOWING') || serviceTypes.includes('FLAT_BED_TOWING')) return '🚗'
      if (serviceTypes.includes('TIRE_CHANGE')) return '🛞'
      if (serviceTypes.includes('BATTERY_JUMPSTART')) return '🔋'
      if (serviceTypes.includes('FUEL_DELIVERY')) return '⛽'
      return '🔧'
    }

    // Add/update provider markers
    serviceProviders.forEach(provider => {
      const lat = provider.latitude
      const lng = provider.longitude
      
      const isPremium = provider.subscriptionTier === 'PREMIUM' || provider.subscriptionTier === 'ENTERPRISE'
      const markerSize = isPremium ? 44 : 38
      const borderColor = isPremium ? '#FFD700' : '#10B981'
      const serviceIcon = getServiceIcon(provider.serviceTypes)
      
      const iconHtml = `
        <div style="
          position: relative;
          width: ${markerSize}px;
          height: ${markerSize}px;
        ">
          ${isPremium ? `
            <div style="
              position: absolute;
              top: -4px;
              left: -4px;
              width: ${markerSize + 8}px;
              height: ${markerSize + 8}px;
              border-radius: 50%;
              background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
              opacity: 0.3;
              animation: pulse 2s ease-in-out infinite;
            "></div>
          ` : ''}
          <div style="
            width: ${markerSize}px;
            height: ${markerSize}px;
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            border: 3px solid ${borderColor};
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${markerSize * 0.45}px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            position: relative;
          ">
            ${serviceIcon}
            ${provider.isVerified ? `
              <div style="
                position: absolute;
                top: -4px;
                right: -4px;
                width: 16px;
                height: 16px;
                background: #3B82F6;
                border: 2px solid white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="font-size: 10px; color: white;">✓</span>
              </div>
            ` : ''}
          </div>
        </div>
      `

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-marker provider-marker',
        iconSize: [markerSize + 8, markerSize + 8],
        iconAnchor: [(markerSize + 8) / 2, (markerSize + 8) / 2],
        popupAnchor: [0, -(markerSize + 8) / 2]
      })

      // Check if marker already exists
      let marker = providerMarkersRef.current.get(provider.id)
      
      if (marker) {
        marker.setLatLng([lat, lng])
        marker.setIcon(customIcon)
      } else {
        marker = L.marker([lat, lng], { icon: customIcon })
        
        // Create popup
        const popupContainer = document.createElement('div')
        popupContainer.style.cssText = 'min-width: 240px; font-family: Arial, sans-serif;'
        
        const serviceNames: Record<string, string> = {
          'TIRE_CHANGE': 'Смяна на гуми',
          'TOWING': 'Пътна помощ',
          'FUEL_DELIVERY': 'Доставка на гориво',
          'BATTERY_JUMPSTART': 'Стартиране с кабели',
          'LOCKOUT_SERVICE': 'Отключване',
          'MECHANICAL_REPAIR': 'Механичен ремонт',
          'FLAT_BED_TOWING': 'Репатрак',
          'MOTORCYCLE_TOWING': 'Теглене на мотор',
          'WINCHING': 'Изтегляне с лебедка',
          'EMERGENCY_ROADSIDE': 'Спешна пътна помощ'
        }
        
        const servicesHtml = provider.serviceTypes
          .slice(0, 4)
          .map(type => `<span style="
            display: inline-block;
            padding: 2px 8px;
            background: #E5E7EB;
            border-radius: 4px;
            font-size: 11px;
            margin: 2px;
          ">${serviceNames[type] || type}</span>`)
          .join('')
        
        const ratingStars = '★'.repeat(Math.round(provider.averageRating)) + '☆'.repeat(5 - Math.round(provider.averageRating))
        
        popupContainer.innerHTML = `
          <div style="padding: 4px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #10B981 0%, #059669 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
              ">${serviceIcon}</div>
              <div>
                <div style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 4px;">
                  ${provider.businessName}
                  ${provider.isVerified ? '<span style="color: #3B82F6;">✓</span>' : ''}
                  ${isPremium ? '<span style="color: #FFD700;">⭐</span>' : ''}
                </div>
                <div style="font-size: 12px; color: #666;">
                  ${provider.city || ''}${provider.city && provider.country ? ', ' : ''}${provider.country || ''}
                </div>
              </div>
            </div>
            
            <div style="margin-bottom: 8px;">
              <span style="color: #F59E0B;">${ratingStars}</span>
              <span style="font-size: 12px; color: #666; margin-left: 4px;">(${provider.totalRatings} оценки)</span>
            </div>
            
            <div style="margin-bottom: 10px; line-height: 1.8;">
              ${servicesHtml}
              ${provider.serviceTypes.length > 4 ? `<span style="font-size: 11px; color: #666;">+${provider.serviceTypes.length - 4} още</span>` : ''}
            </div>
            
            ${provider.is24Hours ? `
              <div style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: #DCFCE7;
                color: #166534;
                border-radius: 4px;
                font-size: 12px;
                margin-bottom: 10px;
              ">
                <span>🕐</span> 24/7
              </div>
            ` : ''}
            
            <div style="display: flex; gap: 8px;">
              <a href="tel:${provider.phoneNumber}" style="
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                padding: 8px;
                background: #10B981;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
              ">
                📞 Обади се
              </a>
            </div>
          </div>
        `
        
        const popup = L.popup({
          maxWidth: 300,
          minWidth: 240,
          className: 'provider-popup'
        }).setContent(popupContainer)
        
        marker.bindPopup(popup)
        marker.addTo(map)
        providerMarkersRef.current.set(provider.id, marker)
      }
    })
  }, [serviceProviders, isLoaded, showProviders])

  return (
    <div className="h-full w-full relative">
      {/* Map container - always rendered */}
      <div 
        ref={mapRef}
        className="h-full w-full"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#f0f0f0'
        }}
      />
      
      {/* Loading overlay - shown on top while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <div className="text-gray-600 text-sm">Loading map...</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeafletMap
