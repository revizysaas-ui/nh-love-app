const CACHE = 'nh-cache-v1'
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.svg', '/icon-512.svg']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim())
})

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      return caches.open(CACHE).then(c => { c.put(e.request, res.clone()); return res })
    }))
  )
})
