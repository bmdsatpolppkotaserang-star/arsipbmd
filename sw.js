const CACHE_NAME = 'si-adi-v3.3';

// Daftar asset statis yang akan disimpan ke dalam cache lokal saat install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/maskable_icon_x192.png',
  './icons/maskable_icon_x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// 1. INSTALL EVENT: Menyimpan App Shell ke Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell & Assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE EVENT: Membersihkan Cache Versi Lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Menghapus Cache Lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH EVENT: Network-First dengan Fallback ke Cache
self.addEventListener('fetch', (event) => {
  // Biarkan request API Google Apps Script (GAS) langsung menuju jaringan tanpa di-cache
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Jika jaringan tersedia dan memberikan respon valid, perbarui cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline / jaringan bermasalah, ambil dari cache lokal
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Jika halaman tidak ditemukan di cache (opsional fallback)
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
