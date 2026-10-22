// 성배가 차는 밤 — 오프라인 플레이용 서비스 워커
// 게임 파일은 항상 네트워크를 먼저 확인해 새 버전을 받고, 연결이 없을 때만 저장해 둔 사본을 씁니다.
// 다른 주소(글꼴, 방문자 집계)와 /api/ 요청은 건드리지 않고 브라우저에 그대로 맡깁니다.
const CACHE = 'cupnight-v2';
const CORE = ['./', 'manifest.webmanifest', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // 같은 주소의 게임 파일: 네트워크 우선, 실패하면 저장본
  e.respondWith(fetch(req).then(res => {
    if (res.ok && !res.redirected) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })
    .then(hit => hit || (req.mode === 'navigate' ? caches.match('./') : undefined))
    .then(hit => hit || Response.error())));
});
