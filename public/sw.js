// Minimal service worker — enables "Add to Home Screen" PWA install prompt.
// No caching: the app is online-only. All requests pass through to the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
