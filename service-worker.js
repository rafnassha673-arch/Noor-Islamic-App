
const CACHE_NAME = "noor-islamic-app-v7";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./quran-reading.html",
  "./quran-search.html",
  "./quran-video.html",
  "./settings.html",
  "./about.html",

  // MAJLISUNNOOR images
  "./majlisunnoor/Screenshot_20261029_213525.jpg",
  "./majlisunnoor/Screenshot_20261029_213542.jpg",
  "./majlisunnoor/Screenshot_20261029_213559.jpg",
  "./majlisunnoor/Screenshot_20261029_213614.jpg",
  "./majlisunnoor/Screenshot_20261029_213628.jpg",
  "./majlisunnoor/Screenshot_20261029_213640.jpg",
  "./majlisunnoor/Screenshot_20261029_213651.jpg",
  "./majlisunnoor/Screenshot_20261029_213703.jpg",
  "./majlisunnoor/Screenshot_20261029_213722.jpg",
  "./majlisunnoor/Screenshot_20261029_213736.jpg",
  "./majlisunnoor/Screenshot_20261029_213747.jpg",
  "./majlisunnoor/Screenshot_20261029_213756.jpg",
  "./majlisunnoor/Screenshot_20261029_213811.jpg",
  "./majlisunnoor/Screenshot_20261029_213822.jpg",
  "./majlisunnoor/Screenshot_20261029_213831.jpg",
  "./majlisunnoor/Screenshot_20261029_213841.jpg",
  "./majlisunnoor/Screenshot_20261029_213851.jpg",
  "./majlisunnoor/Screenshot_20261029_213901.jpg",
  "./majlisunnoor/Screenshot_20261029_213911.jpg",
  "./majlisunnoor/Screenshot_20261029_213922.jpg",
  "./majlisunnoor/Screenshot_20261029_213934.jpg",
  "./majlisunnoor/Screenshot_20261029_214001.jpg"
];

// Install and cache app files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of APP_FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn("Could not cache:", file, error);
        }
      }
    })
  );

  self.skipWaiting();
});

// Activate new service worker and remove old app caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("noor-islamic-app-") &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

// Network-first strategy for same-origin requests
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Do not intercept external APIs or other websites
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);

        if (response && response.ok) {
          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy))
            .catch((error) => {
              console.warn("Cache update failed:", error);
            });
        }

        return response;
      } catch (error) {
        const cached = await caches.match(event.request);

        if (cached) return cached;

        if (event.request.mode === "navigate") {
          const home = await caches.match("./index.html");
          if (home) return home;
        }

        return new Response("You are offline. Please reconnect and try again.", {
          status: 503,
          statusText: "Offline"
        });
      }
    })()
  );
});
