// 성배가 차는 밤 — 서버 쪽 코드
// 게임 파일(public/)은 클라우드플레어가 바로 내주고, 여기서는 /api/ 요청만 받는다.
// 지금은 상태 확인용 /api/health 하나뿐이다. 통계·기록 공유 같은 기능은 여기에 덧붙인다.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, time: new Date().toISOString() });
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'not_found' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
