const CACHE_NAME = 'pss-images-v5';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isSpriteRequest =
        url.hostname === 'api.pixelstarships.com' &&
        url.pathname.includes('FileService/DownloadSprite');
    const isImage = event.request.destination === 'image';

    if (!isSpriteRequest && !isImage) return;

    event.respondWith(cacheFirst(event.request, isSpriteRequest));
});

async function cacheFirst(request, isSpriteRequest) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    // For cross-origin sprite downloads, we use a `no-cors` Request so the browser
    // can return an opaque response (which we can still cache).
    const fetchRequest = isSpriteRequest
        ? new Request(request.url, {
              method: 'GET',
              mode: 'no-cors',
              credentials: 'omit',
              referrer: '',
              referrerPolicy: 'no-referrer',
          })
        : request;

    try {
        const response = await fetch(fetchRequest, { referrerPolicy: 'no-referrer' });

        try {
            await cache.put(request, response.clone());
        } catch {}

        return response;
    } catch (err) {
        const fallback = await cache.match(request);
        if (fallback) return fallback;

        // Let the request fail in a controlled way.
        return Response.error();
    }
}
