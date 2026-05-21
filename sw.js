const CACHE_NAME = 'neon-arcade-v3';

const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const GAME_PATHS = [
  '/tetris/index.html',
  '/2048/index.html',
  '/snake/index.html',
  '/flappy/index.html',
  '/shooter/index.html',
  '/chess/index.html',
  '/minesweeper/index.html',
  '/match3/index.html',
  '/spaceciv/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.allSettled(
        PRECACHE_FILES.map(url =>
          fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {})
        )
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
      await self.clients.claim();
      const cache = await caches.open(CACHE_NAME);
      for (const url of GAME_PATHS) {
        const cached = await cache.match(url);
        if (!cached) {
          fetch(url).then(r => { if (r.ok) cache.put(url, r); }).catch(() => {});
        }
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.url.startsWith('chrome-extension://')) return;
  event.respondWith(fromCacheOrFetch(event.request));
});

async function fromCacheOrFetch(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    if (request.url.endsWith('.png') || request.url.endsWith('.ico')) {
      return new Response(null, { status: 404 });
    }
    return new Response('网络不可用，请连接后重试', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
