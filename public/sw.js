// Basic service worker for EventHaiti PWA
// Extensible: add caching strategies or push handlers later
const STATIC_CACHE = 'eventhaiti-static-v2'
const NAV_CACHE = 'eventhaiti-nav-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192.svg',
        '/icon-512.svg',
        '/offline.html'
      ])
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => ![STATIC_CACHE, NAV_CACHE].includes(k)).map(k => caches.delete(k))
    ))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const isNavigation = request.mode === 'navigate'
  if (isNavigation) {
    event.respondWith(
      fetch(request).then(resp => {
        const clone = resp.clone()
        if (resp.ok) caches.open(NAV_CACHE).then(c => c.put(request, clone))
        return resp
      }).catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
    )
    return
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((resp) => {
        const clone = resp.clone()
        if (resp.ok && request.url.startsWith(self.location.origin)) {
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
        }
        return resp
      }).catch(() => cached || Response.error())
    })
  )
})

// Placeholder push handler (extend later)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'EventHaiti', body: 'New update available.', data: { url: '/' } }
  const actions = [
    { action: 'open-tickets', title: 'Tickets' },
    { action: 'open-home', title: 'Home' }
  ]
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: 'eventhaiti-general',
      renotify: false,
      timestamp: Date.now(),
      actions,
      data: data.data || {}
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  let url = data.url || '/'
  if (event.action === 'open-tickets') url = '/tickets'
  if (event.action === 'open-home') url = '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
