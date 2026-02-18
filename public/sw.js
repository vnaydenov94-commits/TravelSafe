// TravelSafe Service Worker for Push Notifications

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated')
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event)
  
  let notificationData = {
    title: 'TravelSafe',
    body: 'You have a new message',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'message-notification',
    data: {}
  }

  try {
    if (event.data) {
      const data = event.data.json()
      notificationData = {
        title: data.title || 'TravelSafe',
        body: data.body || 'You have a new message',
        icon: data.icon || '/icon-192x192.png',
        badge: data.badge || '/icon-72x72.png',
        tag: data.tag || 'message-notification',
        data: data.data || {},
        requireInteraction: data.requireInteraction || false,
        vibrate: data.vibrate || [200, 100, 200]
      }
    }
  } catch (error) {
    console.error('Error parsing push data:', error)
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      requireInteraction: notificationData.requireInteraction,
      vibrate: notificationData.vibrate,
      actions: [
        {
          action: 'open',
          title: 'Отвори'
        },
        {
          action: 'close',
          title: 'Затвори'
        }
      ]
    })
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event)
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const data = event.notification.data || {}
      const urlToOpen = data.url || '/chat'

      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i]
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }

      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
