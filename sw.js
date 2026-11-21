// Guarda so a casca do app; as musicas vem sempre da rede.
const CACHE = 'ecoo-v11';
const CASCA = ['./', 'index.html', 'estilo.css', 'app.js', 'biblioteca.js', 'letra.js', 'visual.js', 'config.js','icone.svg', 'logo-oo.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CASCA))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'ecoo-audios').map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/audio/')) return;
  // rede primeiro, cache se estiver offline
  e.respondWith(fetch(e.request).then(r => {
    const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r;
  }).catch(() => caches.match(e.request)));
});
