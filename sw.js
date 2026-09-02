// Retro Web Arcade - Service Worker
// 목적: (1) PWA 설치 요건 충족 (2) 앱 셸(정적 파일) 캐싱으로 재방문 시 빠른 로딩
// 주의: EmulatorJS 코어/롬 파일은 캐싱하지 않음 (CDN 자체 캐싱 정책에 맡김 + 용량 문제)

const CACHE_NAME = 'rwa-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/select.css',
  './css/library.css',
  './css/play.css',
  './js/device.js',
  './js/games-data.js',
  './js/emulator.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 외부 CDN(에뮬레이터 코어 등)은 캐싱 전략에 관여하지 않고 그대로 네트워크로 흘려보냄
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
