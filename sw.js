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

    const fetchOpts = isSpriteRequest
        ? {
              mode: 'no-cors',
              credentials: 'omit',
              referrer: '',
              referrerPolicy: 'no-referrer',
          }
        : { referrerPolicy: 'no-referrer' };

    const response = await fetch(request, fetchOpts);

    try {
        await cache.put(request, response.clone());
    } catch {}

    return response;
}
