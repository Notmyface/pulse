// Pulse Service Worker (Web Push & PWA Desteği)
const CACHE_NAME = "pulse-cache-v2";
const OFFLINE_URLS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// PWA Yüklenebilirlik Kriteri İçin Fetch Olay Dinleyicisi
self.addEventListener("fetch", (event) => {
  // Yalnızca GET isteklerini ele al
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match("/");
        });
      })
  );
});

// Kilit Ekranı / Mobil Push Bildirimi Olayı (Push Event)
self.addEventListener("push", (event) => {
  let data = {
    title: "Pulse Bildirimi",
    body: "Ekibinizde yeni bir görev veya mesaj var.",
    url: "/"
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/"
    },
    actions: [
      { action: "open", title: "Görüntüle" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Bildirime Dokunulduğunda Uygulamayı Açma
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
