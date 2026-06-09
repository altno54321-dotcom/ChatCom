const CACHE_NAME = 'skycast-weather-v1';
const DYNAMIC_CACHE = 'skycast-dynamic-v1';

// Static assets to cache immediately on install
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon.png',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Event - Pre-cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Pre-caching offline assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
    return self.clients.claim();
});

// Fetch Event - Handle caching strategies
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // If it's a call to the Open-Meteo Weather API -> Network First, fallback to cache
    if (url.hostname.includes('api.open-meteo.com') || url.hostname.includes('geocoding-api.open-meteo.com')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Offline fallback
                    return caches.match(event.request);
                })
        );
    } else {
        // For static assets (HTML, CSS, Icons) -> Cache First, fallback to network
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                return cachedResponse || fetch(event.request).then(fetchResponse => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, fetchResponse.clone());
                        return fetchResponse;
                    });
                });
            })
        );
    }
});