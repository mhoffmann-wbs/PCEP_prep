// Cross-origin isolation for hosts that can't set response headers (GitHub
// Pages). Interactive input() needs SharedArrayBuffer, which browsers only
// allow on cross-origin isolated pages.
// - Loaded by the page: registers this file as a service worker, then reloads
//   once so the page itself comes through it.
// - Running as the service worker: adds the COOP/COEP headers to every response.
// The dev and preview servers send the headers themselves (vite.config.ts), so
// there the page is already isolated and nothing is registered.
/* global self */
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting())
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
  self.addEventListener('fetch', (event) => {
    const request = event.request
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return
    event.respondWith(
      fetch(request).then((response) => {
        if (response.status === 0) return response
        const headers = new Headers(response.headers)
        headers.set('Cross-Origin-Opener-Policy', 'same-origin')
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
        headers.set('Cross-Origin-Resource-Policy', 'same-origin')
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
      }),
    )
  })
} else if (!window.crossOriginIsolated && window.isSecureContext && 'serviceWorker' in navigator) {
  const KEY = 'pcep101:coi-reload'
  navigator.serviceWorker.register(document.currentScript.src).then(
    () =>
      navigator.serviceWorker.ready.then(() => {
        // Reload once; if the page still isn't isolated after that, the browser
        // doesn't support it, and input() falls back to lines given in advance.
        try {
          if (sessionStorage.getItem(KEY)) return
          sessionStorage.setItem(KEY, '1')
        } catch {
          return
        }
        window.location.reload()
      }),
    () => {},
  )
}
