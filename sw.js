const CACHE_NAME = 'pss-images-v5';

const CSP_POLICY = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://api.pixelstarships.com https://api.pssvikings.com https://pixelstarships.s3.amazonaws.com; connect-src 'self' https://api.pixelstarships.com https://api.pssvikings.com; font-src 'self' data:; media-src 'self' https://api.pixelstarships.com https://api.pssvikings.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";

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
    // Image caching is disabled; the worker now only hardens document responses.
    if (event.request.mode === 'navigate') {
        event.respondWith(addSecurityHeaders(event.request));
        return;
    }

    // if (event.request.method !== 'GET') return;
    //
    // const url = new URL(event.request.url);
    // const isSpriteRequest =
    //     url.hostname === 'api.pixelstarships.com' &&
    //     url.pathname.includes('FileService/DownloadSprite');
    // const isImage = event.request.destination === 'image';
    //
    // if (!isSpriteRequest && !isImage) return;
    //
    // event.respondWith(cacheFirst(event.request, isSpriteRequest));
});

async function addSecurityHeaders(request) {
    const response = await fetch(request);

    const headers = new Headers(response.headers);
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Content-Security-Policy', CSP_POLICY);

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

// async function cacheFirst(request, isSpriteRequest) {
//     const cache = await caches.open(CACHE_NAME);
//     const cached = await cache.match(request);
//     if (cached) return cached;
//
//     const fetchOpts = isSpriteRequest
//         ? {
//               mode: 'no-cors',
//               credentials: 'omit',
//               referrer: '',
//               referrerPolicy: 'no-referrer',
//           }
//         : { referrerPolicy: 'no-referrer' };
//
//     const response = await fetch(request, fetchOpts);
//
//     try {
//         await cache.put(request, response.clone());
//     } catch {}
//
//     return response;
// }
