'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const VAPID_PUBLIC_KEY = 'BII3JwTBC9pNdUcTlHUG2AUjT-NMzvRBEpW4RSjZgcVANA_n0owEGGUQHfCZ2-LDtFGRnFJiZbL10BhEwkWZvCA'

export function usePushNotifications() {
  const { data: session } = useSession() || {}
  const [isSupported, setIsSupported] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Check if push notifications are supported
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [session])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !session) {
      console.log('Push notifications not supported or user not logged in')
      return false
    }

    setIsLoading(true)

    try {
      // Request permission if not granted
      if (permission !== 'granted') {
        const granted = await requestPermission()
        if (!granted) {
          console.log('Notification permission denied')
          setIsLoading(false)
          return false
        }
      }

      // Register service worker if not registered
      let registration = await navigator.serviceWorker.getRegistration()
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        })
        await navigator.serviceWorker.ready
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })

      // Send subscription to backend
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      })

      if (response.ok) {
        setIsSubscribed(true)
        console.log('Successfully subscribed to push notifications')
        setIsLoading(false)
        return true
      } else {
        console.error('Failed to save subscription to backend')
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      setIsLoading(false)
      return false
    }
  }

  const unsubscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      return false
    }

    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      // Remove subscription from backend
      const response = await fetch('/api/push/subscribe', {
        method: 'DELETE'
      })

      if (response.ok) {
        setIsSubscribed(false)
        console.log('Successfully unsubscribed from push notifications')
        setIsLoading(false)
        return true
      } else {
        console.error('Failed to remove subscription from backend')
        setIsLoading(false)
        return false
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      setIsLoading(false)
      return false
    }
  }

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}
