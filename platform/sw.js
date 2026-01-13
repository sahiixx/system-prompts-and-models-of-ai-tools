// Service Worker for AI Tools Hub PWA
const CACHE_NAME = 'ai-tools-hub-v1';
const API_CACHE = 'ai-tools-api-v1';

const STATIC_ASSETS = [
  '/platform/',
  '/platform/index.html',
  '/platform/explore.html',
  '/platform/dashboard-enhanced.html',
  '/platform/profile.html',
  '/platform/auth.html',
  '/platform/manifest.json'
];

const API_URLS = [
  'https://sahiixx.github.io/system-prompts-and-models-of-ai-tools/api/index.json',
  'https://sahiixx.github.io/system-prompts-and-models-of-ai-tools/api/features.json',
  'https://sahiixx.github.io/system-prompts-and-models-of-ai-tools/api/statistics.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - network first, cache fallback
  if (API_URLS.some(apiUrl => request.url.startsWith(apiUrl))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || new Response('Offline - no cached data', { status: 503 });
          });
        })
    );
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response.clone());
          return response;
        });
      });
    }).catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/platform/index.html');
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  } else if (event.tag === 'sync-reviews') {
    event.waitUntil(syncReviews());
  }
});

// Sync favorites
async function syncFavorites() {
  try {
    const favorites = await getStoredData('pendingFavorites');
    if (favorites && favorites.length > 0) {
      // Send to server
      await fetch('/api/favorites', {
        method: 'POST',
        body: JSON.stringify(favorites),
        headers: { 'Content-Type': 'application/json' }
      });
      // Clear pending
      await clearStoredData('pendingFavorites');
    }
  } catch (error) {
    console.error('[Service Worker] Sync favorites failed:', error);
  }
}

// Sync reviews
async function syncReviews() {
  try {
    const reviews = await getStoredData('pendingReviews');
    if (reviews && reviews.length > 0) {
      // Send to server
      await fetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(reviews),
        headers: { 'Content-Type': 'application/json' }
      });
      // Clear pending
      await clearStoredData('pendingReviews');
    }
  } catch (error) {
    console.error('[Service Worker] Sync reviews failed:', error);
  }
}

// Helper functions
async function getStoredData(key) {
  const cache = await caches.open('user-data');
  const response = await cache.match(`/${key}`);
  if (response) {
    return response.json();
  }
  return null;
}

async function clearStoredData(key) {
  const cache = await caches.open('user-data');
  await cache.delete(`/${key}`);
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/platform/icon-192.png',
    badge: '/platform/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Explore', icon: '/platform/icon-192.png' },
      { action: 'close', title: 'Close', icon: '/platform/icon-192.png' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('AI Tools Hub', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/platform/explore.html')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/platform/')
    );
  }
});

// Message handler for communication with pages
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('[Service Worker] Loaded');
