// Linforo reminder service worker
// Minimal SW that enables web push notifications

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || '🇮🇹 Linforo'
  const body = data.body || "Ready for today's Italian?"
  const icon = data.icon || '/favicon.ico'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: 'linforo-daily-reminder',
      renotify: true,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    })
  )
})
