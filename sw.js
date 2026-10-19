// 예전 주소(깃헙 페이지)용 서비스 워커: 저장해 둔 사본을 지우고 스스로 해제한다.
// 게임은 https://holygrailwargame.cupnight.workers.dev/ 로 옮겼다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(c => c.navigate(c.url));
  })());
});
