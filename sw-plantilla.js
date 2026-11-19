/*
 * Service worker de La Gran Aventura (lo genera `npm run build` a partir de esta plantilla).
 * Guarda todo el juego en caché al instalarse: después de abrirlo una vez con internet,
 * funciona sin conexión. Incluye los modelos, sus texturas externas y la música de public/.
 */
const VERSION = '__VERSION__';
const ARCHIVOS = __ARCHIVOS__;
const CACHE = 'lga-' + VERSION;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(ARCHIVOS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) if (nombre.startsWith('lga-') && nombre !== CACHE) await caches.delete(nombre);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // ignoreSearch: ?evento=1 y ?debug=1 usan la misma página guardada.
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) return guardado;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
        return Response.error();
      }
    })(),
  );
});
