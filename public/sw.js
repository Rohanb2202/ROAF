// Update this version string on each deployment to bust the cache
const CACHE_VERSION = "v2-" + Date.now()
const CACHE_NAME = "roaf-" + CACHE_VERSION
const urlsToCache = ["/logo.png", "/manifest.json"]

// Install service worker - immediately take over
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache:", CACHE_NAME)
      return cache.addAll(urlsToCache)
    }),
  )
  // Force the waiting service worker to become active
  self.skipWaiting()
})

// Fetch event - NETWORK FIRST strategy for HTML/JS, cache for static assets
self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== "GET") {
    return
  }

  // For HTML pages and API requests - always go network first
  if (
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response
        })
        .catch(() => {
          // Only serve from cache if network fails (offline)
          return caches.match(request)
        }),
    )
    return
  }

  // For static assets (images, fonts) - use stale-while-revalidate
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache)
            })
          }
          return networkResponse
        })
        return cachedResponse || fetchPromise
      }),
    )
    return
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Push notification event
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {}
  const title = data.title || "New Message"
  const options = {
    body: data.body || "You have a new message",
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [200, 100, 200],
    tag: "roaf-message",
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes("/chat") && "focus" in client) {
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow("/chat")
      }
    }),
  )
})
