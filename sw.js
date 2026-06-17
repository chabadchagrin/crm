// DAAS service worker — minimal, exists to receive Web Share Target POSTs
// (text + image screenshots) on a static GitHub Pages host with no backend.

const SHARE_CACHE = 'daas-share-v1';

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept the share-target POST to ./share
  if (event.request.method === 'POST' && url.pathname.endsWith('/share')) {
    event.respondWith((async () => {
      try {
        const form = await event.request.formData();
        const text = [form.get('title'), form.get('text'), form.get('url')]
          .filter(Boolean).join('\n').trim();

        const files = form.getAll('image') || [];
        const cache = await caches.open(SHARE_CACHE);

        // Stash text in a fake response the page can read
        await cache.put('shared-text', new Response(text || ''));

        // Stash the first shared image (if any) as a blob
        if (files && files.length && files[0] && files[0].size) {
          await cache.put('shared-image', new Response(files[0], {
            headers: { 'Content-Type': files[0].type || 'image/png' }
          }));
        } else {
          await cache.delete('shared-image');
        }
      } catch (err) {
        // swallow — we still redirect into the app
      }
      // Redirect into the app with a flag so it knows to pull the shared payload
      return Response.redirect('./index.html?shared=1', 303);
    })());
  }
});
