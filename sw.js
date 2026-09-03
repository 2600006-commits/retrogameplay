// Retro Web Arcade - Service Worker
// 목적: (1) PWA 설치 요건 충족 (2) 오프라인일 때를 위한 예비 캐시
//
// 전략: 네트워크 우선(network-first). 온라인이면 항상 최신 파일을 받아오고,
// 실패했을 때만(오프라인 등) 캐시로 대체합니다.
// (예전 버전은 캐시 우선(cache-first)이었는데, 그 방식은 배포 후에도
//  브라우저가 예전에 저장해둔 낡은 JS/CSS를 계속 사용하는 문제가 있었습니다.
//  이 버전으로 바뀌면서, 다음 방문 시 자동으로 새 파일을 받아오도록
//  self.skipWaiting() + clients.claim() + 아래 main.js의 controllerchange
//  리로드 로직이 함께 동작합니다.)
//
// 주의: EmulatorJS 코어/롬 파일(cdn.emulatorjs.org)은 이 SW가 관여하지 않고
// 그대로 네트워크로 흘려보내며, 캐싱은 EmulatorJS 자체 정책에 맡깁니다.

const CACHE_VERSION = 'v2'; // 배포 때마다 캐시를 무조건 갱신하고 싶으면 이 값을 올리세요.
const CACHE_NAME = `rwa-shell-${CACHE_VERSION}`;
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
      .catch(() => { /* 프리캐시 실패해도 SW 설치 자체는 계속 진행 (fetch 시 네트워크로 처리됨) */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // 이전 버전 캐시(rwa-shell-v1 등)는 전부 삭제해서 낡은 파일이 남지 않도록 함
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
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // 오프라인일 때만 캐시로 대체
  );
});
