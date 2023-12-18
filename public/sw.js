import { del, entries } from "https://cdn.jsdelivr.net/npm/idb-keyval@6/+esm";
const CACHE_NAME = 'v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/upload.html',
  '/about.html',
  '/404.html',
  '/offline.html'
];

// instalacija i caching
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// aktivacija i lčišćenje starih cacheova
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});


// dodat offline
// obrada mrežnih zahtjeva
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                // ako želim da se prioritizira mrežni zahtvjev
                // prije keša, otkomentiraj
                // return response;
            }
            return fetch(event.request).then((response) => {
                if (response.status === 404) {
                    return caches.match("404.html");
                }
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request.url, response.clone());
                    return response;
                });
            });
        }).catch((error) => {
            console.log("Error", event.request.url, error);
            return caches.match("offline.html");
        })
    );
});

// da se upload uspješno dogodi ako je stranica offline
// za backround sync
self.addEventListener("sync", function (event) {
    console.log("Background sync!", event);
    if (event.tag === "sync-audio") {
        event.waitUntil(syncAudio());
    }
});

async function syncAudio() {
    const audioEntries = await entries();
    for (const [key, audioData] of audioEntries) {
        try {
            const formData = new FormData();
            formData.append('audio', audioData.audio, audioData.id + '.mp3');
            formData.append('title', audioData.title);
            formData.append('timestamp', audioData.ts);

            const response = await fetch('/saveAudio', {
                method: 'POST',
                body: formData,
            });

            const jsonResponse = await response.json();
            if (jsonResponse.success) {
                console.log('Audio zapis uspješno uploadan:', audioData.title);
                await del(key);
            } else {
                throw new Error('Server nije uspješno obradio zahtjev: ' + jsonResponse.error.message);
            }
        } catch (error) {
            console.error('Greška pri uploadu:', error);
        }
    }
}


