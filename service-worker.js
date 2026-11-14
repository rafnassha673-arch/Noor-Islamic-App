
const CACHE_NAME = "noor-islamic-app-v9";

// PDF.js CDN files
const PDFJS_FILES = [
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
];

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",

  // NEW NOOR ICONS
  "./noor-icon-192.png",
  "./noor-icon-512.png",

  // Main pages
  "./quran-reading.html",
  "./quran-search.html",
  "./quran-video.html",
  "./settings.html",
  "./about.html",
  "./asma-al-husna.html",

  // Haddad Rathib
  "./haddad-rathib.html",
  "./haddad-rathib.pdf",

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

// INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Cache app files individually
      for (const file of APP_FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn("Could not cache app file:", file, error);
        }
      }

      // Cache PDF.js CDN files
      for (const file of PDFJS_FILES) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn("Could not cache PDF.js:", file, error);
        }
      }

      await self.skipWaiting();
    })()
  );
});

// ACTIVATE
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

// FETCH
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  const isSameOrigin = url.origin === self.location.origin;
  const isPdfJs = PDFJS_FILES.includes(url.href);

  // Handle only app files and specified PDF.js CDN files
  if (!isSameOrigin && !isPdfJs) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        // Network first
        const response = await fetch(request);

        if (response && response.ok && response.type !== "opaque") {
          await cache.put(request, response.clone());
        }

        return response;

      } catch (error) {
        // Check exact cached request
        const cached = await caches.match(request);

        if (cached) return cached;

        // Support offline PDF range requests
        const rangeHeader = request.headers.get("Range");

        if (rangeHeader && isSameOrigin) {
          const fullResponse = await caches.match(url.href);

          if (fullResponse) {
            const bytes = await fullResponse.arrayBuffer();
            const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);

            if (match) {
              const start = Number(match[1]);
              const end = match[2]
                ? Math.min(Number(match[2]), bytes.byteLength - 1)
                : bytes.byteLength - 1;

              if (start <= end && start < bytes.byteLength) {
                const chunk = bytes.slice(start, end + 1);

                return new Response(chunk, {
                  status: 206,
                  statusText: "Partial Content",
                  headers: {
                    "Content-Type": "application/pdf",
                    "Content-Range":
                      `bytes ${start}-${end}/${bytes.byteLength}`,
                    "Content-Length": String(chunk.byteLength),
                    "Accept-Ranges": "bytes"
                  }
                });
              }
            }
          }
        }

        // Offline home page fallback
        if (request.mode === "navigate") {
          const home = await caches.match("./index.html");
          if (home) return home;
        }

        return new Response(
          "You are offline. Please reconnect and try again.",
          {
            status: 503,
            statusText: "Offline",
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      }
    })()
  );
});
