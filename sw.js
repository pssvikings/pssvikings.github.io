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
    const cacheKey = new Request(request.url, { method: request.method });
    const metaKey = new Request(request.url + '::sw-meta');

    const cachedResponse = await cache.match(cacheKey);
    const metaResponse = await cache.match(metaKey);

    if (cachedResponse && metaResponse) {
        const cacheTime = Number(await (await cache.match(metaKey)).text());
        if (Date.now() - cacheTime < CACHE_EXPIRY_MS) return cachedResponse;
    } else if (cachedResponse && !metaResponse) {
        return cachedResponse;
    }

    try {
        const headers = new Headers(request.headers);
        headers.delete('referer');
        headers.delete('referrer');

        const init = {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.clone().arrayBuffer() : undefined,
            credentials: 'omit',
            referrer: '',
            referrerPolicy: 'no-referrer',
            redirect: 'follow',
            mode: 'cors',
        };

        const networkResponse = await fetch(new Request(request.url, init));

        if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            await cache.put(cacheKey, networkResponse.clone());
            await cache.put(metaKey, new Response(String(Date.now())));
        } else if (networkResponse && networkResponse.status === 404) {
            // Cache 404 responses for 24 hours to prevent retries
            const notFoundResponse = new Response(null, { status: 404, statusText: 'Not Found' });
            await cache.put(cacheKey, notFoundResponse.clone());
            await cache.put(metaKey, new Response(String(Date.now())));
        }

        return networkResponse;
    } catch (err) {
        if (cachedResponse) return cachedResponse;
        throw err;
    }
}
