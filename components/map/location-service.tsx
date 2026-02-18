
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
}

export interface LocationServiceOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watchInterval?: number
}

export function useLocationService(options: LocationServiceOptions = {}) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  
  const watchIdRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 60000, // 1 minute
    watchInterval = 30000 // 30 seconds
  } = options

  // Check geolocation support and permission
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    // Check permission if available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermission(result.state)
        
        result.addEventListener('change', () => {
          setPermission(result.state)
        })
      }).catch(() => {
        setPermission('unknown')
      })
    }
  }, [])

  // Get current position once
  const getCurrentPosition = useCallback((): Promise<LocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      const geoOptions: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }
          
          setLocation(locationData)
          setError(null)
          resolve(locationData)
        },
        (error) => {
          let errorMessage = 'Unknown location error'
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              setPermission('denied')
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable'
              break
            case error.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
          }
          
          setError(errorMessage)
          reject(new Error(errorMessage))
        },
        geoOptions
      )
    })
  }, [enableHighAccuracy, timeout, maximumAge])

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation || isWatching) {
      return
    }

    const geoOptions: PositionOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge
    }

    setIsWatching(true)
    setError(null)

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const now = Date.now()
        
        // Throttle updates to prevent too frequent calls
        if (now - lastUpdateRef.current < watchInterval) {
          return
        }
        
        lastUpdateRef.current = now
        
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }
        
        setLocation(locationData)
        setError(null)
      },
      (error) => {
        let errorMessage = 'Location watching failed'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied'
            setPermission('denied')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location timeout'
            break
        }
        
        setError(errorMessage)
        
        // Don't spam error toasts
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Please enable location access for TravelSafe to share your position with connections')
        }
      },
      geoOptions
    )
  }, [enableHighAccuracy, timeout, maximumAge, watchInterval, isWatching])

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setIsWatching(false)
    }
  }, [])

  // Request permission explicitly
  const requestPermission = useCallback(async () => {
    try {
      await getCurrentPosition()
      setPermission('granted')
      toast.success('Location access granted')
    } catch (error) {
      console.error('Permission request failed:', error)
    }
  }, [getCurrentPosition])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWatching()
    }
  }, [stopWatching])

  return {
    location,
    error,
    isWatching,
    permission,
    getCurrentPosition,
    startWatching,
    stopWatching,
    requestPermission
  }
}

// Component wrapper for location service
interface LocationServiceProviderProps {
  children: React.ReactNode
  autoStart?: boolean
  options?: LocationServiceOptions
}

export function LocationServiceProvider({ 
  children, 
  autoStart = false, 
  options = {} 
}: LocationServiceProviderProps) {
  const locationService = useLocationService(options)

  useEffect(() => {
    if (autoStart) {
      locationService.requestPermission()
      locationService.startWatching()
    }
  }, [autoStart, locationService])

  return <>{children}</>
}
