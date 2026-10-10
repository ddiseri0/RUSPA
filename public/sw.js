/**
 * Service Worker per RUSPA (PWA & Offline Asset Caching)
 *
 * Strategia di caching calibrata per reti mobili instabili / degradate:
 * 1. Risorse Statiche Hashed (/assets/*): Cache-First (0ms, 0 byte di rete cellulare).
 * 2. Web Fonts (Google Fonts): Cache-First dopo il primo recupero per evitare FOIT e layout shifts.
 * 3. Icone e Manifest: Cache-First con fallback di rete.
 * 4. Navigazione HTML: Network-First con fallback alla shell offline (/index.html).
 * 5. Traffico in tempo reale (Socket.io, /__api/, /__mcp/, Firebase/Firestore):
 *    ESCLUSO CATEGORICAMENTE dalla cache per non alterare la sincronizzazione di gioco.
 */

const NOME_CACHE_STATICA = 'ruspa-static-v1';
const NOME_CACHE_FONT = 'ruspa-fonts-v1';

const RISORSE_PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// Endpoint e protocolli in tempo reale da non intercettare mai
const URL_DA_IGNORARE = [
  '/socket.io',
  '/__api/',
  '/__mcp/',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(NOME_CACHE_STATICA).then(async cache => {
      try {
        await cache.addAll(RISORSE_PRECACHE);
      } catch {
        // Alcune risorse opzionali potrebbero non essere critiche
      }
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(async keys => {
      await Promise.all(
        keys.map(key => {
          if (key !== NOME_CACHE_STATICA && key !== NOME_CACHE_FONT) {
            return caches.delete(key);
          }
        })
      );
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora richieste non GET (POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // Ignora completamente il traffico dinamico di gioco e API real-time
  const deveIgnorare = URL_DA_IGNORARE.some(pattern => request.url.includes(pattern));
  if (deveIgnorare) {
    return;
  }

  // 1. Google Fonts (CSS e WOFF2) e Avatar Emoji 3D da CDN -> Cache-First
  if (
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com' ||
    url.origin === 'https://cdn.jsdelivr.net'
  ) {
    event.respondWith(
      caches.open(NOME_CACHE_FONT).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 2. Asset statici con hash di Vite (/assets/*) -> Cache-First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(NOME_CACHE_STATICA).then(async cache => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 3. Risorse precache radice (icone, manifest) -> Cache-First con fallback di rete
  if (RISORSE_PRECACHE.includes(url.pathname)) {
    event.respondWith(
      caches.open(NOME_CACHE_STATICA).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 4. Navigazione HTML -> Network-First con fallback alla shell in cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(NOME_CACHE_STATICA);
        const shell = await cache.match('/index.html');
        return shell || Response.error();
      })
    );
    return;
  }
});
