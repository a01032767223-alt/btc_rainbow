/* 비트코인 레인보우 · 서비스워커 */
const CACHE = 'btc-rainbow-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/plotly.js/2.27.0/plotly.min.js'
];

// 설치: 앱 셸 캐시
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화: 구버전 캐시 정리
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 요청 처리
self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // 시세 API는 항상 네트워크 우선 (캐시 금지 — 실시간 유지)
  if (url.includes('api.coingecko.com') || url.includes('api.binance.com')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // 그 외(앱 셸, Plotly): 캐시 우선, 없으면 네트워크 후 캐시에 저장
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
