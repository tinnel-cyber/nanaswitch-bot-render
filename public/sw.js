const CACHE_NAME = 'nanasore-v11-live-generator-fix';
const WASM_CACHE_NAME = 'nanasore-v8-wasm';
const IMAGE_CACHE_NAME = 'nanasore-v8-images';
const REELS_VIDEO_CACHE_NAME = 'wameet-reels-video-v4';

// URLs de l'App Shell indispensables pour le démarrage hors-ligne immédiat
const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json?v=nanasore_arrow_v3',
  '/nanasore-icon.svg?v=nanasore_arrow_v3',
  '/favicon.svg?v=nanasore_arrow_v3',
  '/icon.svg?v=nanasore_arrow_v3',
  '/pwa-192x192.png?v=nanasore_arrow_v3',
  '/pwa-512x512.png?v=nanasore_arrow_v3'
];

// URLs des fichiers WebAssembly FFmpeg à pré-cacher pour le hors-ligne
const FFMPEG_PRECACHE_URLS = [
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
  'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
];

// 1. Installation du Service Worker et mise en cache résiliente de l'App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(async (cache) => {
        console.log('[ServiceWorker] Mise en cache initiale de l’App Shell React');
        // Pré-cache robuste avec allSettled pour ne pas faire échouer l'installation si une ressource optionnelle manque
        await Promise.allSettled(
          STATIC_PRECACHE_URLS.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res && (res.status === 200 || res.type === 'opaque')) {
                await cache.put(url, res);
              }
            } catch (err) {
              console.warn('[ServiceWorker] Pré-cache ignoré pour :', url, err);
            }
          })
        );
      }),
      caches.open(WASM_CACHE_NAME).then(async (cache) => {
        console.log('[ServiceWorker] Pré-cache optionnel FFmpeg.wasm');
        await Promise.allSettled(
          FFMPEG_PRECACHE_URLS.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res && (res.status === 200 || res.type === 'opaque')) {
                await cache.put(url, res);
              }
            } catch (err) {
              // Silencieux
            }
          })
        );
      }),
    ]).then(() => self.skipWaiting())
  );
});

// 2. Activation du Service Worker et purge des anciens caches
self.addEventListener('activate', (event) => {
  const allowedCaches = [CACHE_NAME, WASM_CACHE_NAME, IMAGE_CACHE_NAME, REELS_VIDEO_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !allowedCaches.includes(name))
          .map((name) => {
            console.log('[ServiceWorker] Suppression ancien cache :', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Stratégies de requêtes réseau / cache :
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne pas intercepter les requêtes non-GET, APIs externes ou routes dynamiques d'authentification et de tableau de bord
  if (req.method !== 'GET') return;
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/v1/switch/') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/login') ||
    url.pathname.startsWith('/register') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/admin')
  ) {
    return;
  }

  // A. Mise en cache pérenne Cache-First pour WebAssembly et Modèles IA (FFmpeg.wasm & Whisper ONNX)
  const isWasmOrModel =
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.onnx') ||
    url.pathname.endsWith('.bin') ||
    url.hostname.includes('huggingface.co') ||
    url.hostname.includes('cdn-lfs.huggingface.co') ||
    (url.hostname.includes('unpkg.com') && url.pathname.includes('@ffmpeg/core')) ||
    (url.hostname.includes('jsdelivr.net') && url.pathname.includes('ffmpeg'));

  if (isWasmOrModel) {
    event.respondWith(
      caches.open(WASM_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(req);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (fetchErr) {
          console.warn('[ServiceWorker] Fichier WASM indisponible hors-ligne :', url.href);
          return cachedResponse || new Response('WASM offline', { status: 503 });
        }
      })
    );
    return;
  }

  // B. Navigation HTML : Network-First avec repli systématique vers le App Shell React en cache
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            const resClone = networkRes.clone();
            cache.put(req, resClone);
            cache.put('/index.html', networkRes.clone());
            cache.put('/', networkRes.clone());
            return networkRes;
          }
        } catch (err) {
          console.log('[ServiceWorker] Hors-ligne : chargement de l’App Shell React depuis le cache');
        }

        // Repli hors-ligne : recherche dans le cache sous l'URL exacte ou index.html
        const cachedNavigate = await cache.match(req);
        if (cachedNavigate) return cachedNavigate;

        const cachedIndex = (await cache.match('/index.html')) || (await cache.match('/'));
        if (cachedIndex) return cachedIndex;

        return new Response('<!doctype html><html><body><h1>Nanasore Hors-ligne</h1></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })()
    );
    return;
  }

  // C. Assets statiques de même origine (JS, CSS, polices, Vite chunks) : Stale-While-Revalidate sécurisé
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedRes = await cache.match(req);

        // Si présent dans le cache et valide (non corrompu par un fallback HTML 404)
        if (cachedRes) {
          const cachedType = cachedRes.headers.get('content-type') || '';
          if (url.pathname.endsWith('.js') && cachedType.includes('text/html')) {
            // Le cache contient un faux fichier JS (HTML SPA rewrite), on le purge immédiatement
            await cache.delete(req);
          } else {
            // Revalidation discrète en tâche de fond si le réseau est disponible
            fetch(req)
              .then((networkRes) => {
                if (networkRes && networkRes.status === 200) {
                  const netType = networkRes.headers.get('content-type') || '';
                  if (!(url.pathname.endsWith('.js') && netType.includes('text/html'))) {
                    cache.put(req, networkRes.clone());
                  }
                }
              })
              .catch(() => {});
            return cachedRes;
          }
        }

        // Sinon, tentative réseau et enregistrement dans le cache pour les futures utilisations hors-ligne
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            const netType = networkRes.headers.get('content-type') || '';
            // Sécurité anti-crash Vite : ne JAMAIS cacher un index.html réécrit comme un module JS
            if (url.pathname.endsWith('.js') && netType.includes('text/html')) {
              return new Response('/* Chunk superseded */', { status: 404, statusText: 'Chunk Superseded' });
            }
            cache.put(req, networkRes.clone());
          }
          return networkRes;
        } catch (err) {
          // Fallback gracieux : ne JAMAIS résoudre undefined sous peine de plantage du navigateur
          return new Response('', { status: 503, statusText: 'Offline Asset' });
        }
      })()
    );
    return;
  }

  // D. Mise en cache optimisée des images (produits, bannières, avatars distants)
  const isImageRequest =
    req.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i) ||
    url.hostname.includes('images.unsplash.com') ||
    url.hostname.includes('firebasestorage.googleapis.com');

  if (isImageRequest) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) {
          // Revalidation discrète en tâche de fond
          fetch(req)
            .then((networkRes) => {
              if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque')) {
                cache.put(req, networkRes);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(req);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // E. Mise en cache et lecture hors-ligne des vidéos Reels WaMeet (MP4, WEBM, MOV)
  const isVideoRequest =
    req.destination === 'video' ||
    url.pathname.match(/\.(mp4|webm|mov|m4v)$/i) ||
    url.pathname.includes('/videos/') ||
    url.searchParams.has('video');

  if (isVideoRequest) {
    event.respondWith(
      caches.open(REELS_VIDEO_CACHE_NAME).then(async (cache) => {
        const cachedResponse = (await cache.match(req)) || (await cache.match(req.url));
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(req);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || new Response('Offline Video', { status: 503 });
        }
      })
    );
    return;
  }
});

// Écoute de messages clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
