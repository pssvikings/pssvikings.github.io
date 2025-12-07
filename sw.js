const CACHE_NAME = 'pss-images-v1';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                }),
            );
        }),
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Only cache images from pixelstarships API
    if (url.hostname === 'api.pixelstarships.com' && url.pathname.includes('FileService/DownloadSprite')) {
        event.respondWith(handleImageCache(event.request));
    }
});

async function handleImageCache(request) {
    const cache = await caches.open(CACHE_NAME);

    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        const cacheTime = cachedResponse.headers.get('sw-cache-time');
        if (cacheTime) {
            const age = Date.now() - Number.parseInt(cacheTime, 10);
            if (age < CACHE_EXPIRY_MS) {
                return cachedResponse;
            }
        }
    }

    // If not in cache or expired, fetch fresh
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            const headers = new Headers(responseToCache.headers);
            headers.set('sw-cache-time', String(Date.now()));
            const modifiedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers,
            });
            cache.put(request, modifiedResponse);
        }
        return networkResponse;
    } catch {
        // Network failed, return cached if available
        if (cachedResponse) {
            return cachedResponse;
        }
        throw new Error('Network request failed and no cache available');
    }
}
