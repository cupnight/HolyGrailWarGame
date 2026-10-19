// 성배가 차는 밤 — 서버 쪽 코드
// 게임 파일(public/)은 클라우드플레어가 바로 내주고, 여기서는 /api/ 요청만 받는다.
//
//   GET  /api/health  상태 확인
//   POST /api/life    한 생이 끝날 때 게임 결과를 익명으로 받는다
//   GET  /api/stats   모인 결과를 합쳐 돌려준다 (10분 동안 캐시)
//
// 받는 것: 서번트·클래스, 엔딩 종류, 성배 상태, 도시, 출신, 회로 등급, 사망 나이, 언어,
//          그 기기에서 지금까지 연 업적 목록, 기기마다 무작위로 만든 번호.
// 받지 않는 것: 이름, 소원·유언처럼 직접 쓴 문장, IP 주소.

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS lives (
     id TEXT PRIMARY KEY, ts INTEGER NOT NULL, dev TEXT NOT NULL, lang TEXT,
     hero TEXT, cls TEXT, ending TEXT NOT NULL, cup TEXT, city TEXT, origin TEXT, circuit INTEGER, age INTEGER)`,
  `CREATE INDEX IF NOT EXISTS lives_hero ON lives(hero)`,
  `CREATE TABLE IF NOT EXISTS devices (dev TEXT PRIMARY KEY, first INTEGER NOT NULL, last INTEGER NOT NULL, lives INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS dev_ach (dev TEXT NOT NULL, ach TEXT NOT NULL, PRIMARY KEY (dev, ach))`,
];
let schemaReady = null;
const ensureSchema = env => (schemaReady ??= env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))).catch(e => { schemaReady = null; throw e; }));

const ENDINGS = new Set(['shared', 'victor', 'lost', 'survived', 'collapsed', 'withdrew', 'refused', 'dead', 'none']);
const ID = /^[A-Za-z0-9_-]{1,40}$/;               // 서번트·업적·클래스·출신 같은 내부 이름
const WORD = /^[0-9A-Za-z가-힣ぁ-んァ-ヶ一-龯 ._-]{1,30}$/;  // 도시 이름
const str = (v, re) => (typeof v === 'string' && re.test(v) ? v : null);
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

async function postLife(request, env) {
  if (env.RL) {
    const ip = request.headers.get('cf-connecting-ip') || 'x';
    const { success } = await env.RL.limit({ key: ip });
    if (!success) return json({ ok: false, error: 'slow_down' }, 429);
  }
  const len = Number(request.headers.get('content-length') || 0);
  if (len > 8000) return json({ ok: false, error: 'too_big' }, 413);
  let b;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'bad_json' }, 400); }
  if (!b || b.v !== 1) return json({ ok: false, error: 'bad_version' }, 400);

  const id = str(b.life, ID), dev = str(b.dev, ID), ending = ENDINGS.has(b.end) ? b.end : null;
  if (!id || !dev || !ending) return json({ ok: false, error: 'bad_fields' }, 400);
  const hero = str(b.hero, ID), cls = str(b.cls, ID);
  const cup = b.cup === 'pure' || b.cup === 'dark' ? b.cup : null;
  const lang = ['ko', 'en', 'ja'].includes(b.lang) ? b.lang : null;
  const ach = Array.isArray(b.ach) ? [...new Set(b.ach.filter(a => str(a, ID)))].slice(0, 300) : [];
  const now = Date.now();

  await ensureSchema(env);
  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO lives (id, ts, dev, lang, hero, cls, ending, cup, city, origin, circuit, age)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, now, dev, lang, hero, cls, ending, cup, str(b.city, WORD), str(b.origin, ID), int(b.circuit, 0, 9), int(b.age, 0, 150)).run();
  const fresh = ins.meta && ins.meta.changes > 0;

  const stmts = [
    env.DB.prepare(
      `INSERT INTO devices (dev, first, last, lives) VALUES (?, ?, ?, ?)
       ON CONFLICT(dev) DO UPDATE SET last = excluded.last, lives = devices.lives + excluded.lives`
    ).bind(dev, now, now, fresh ? 1 : 0),
    ...ach.map(a => env.DB.prepare(`INSERT OR IGNORE INTO dev_ach (dev, ach) VALUES (?, ?)`).bind(dev, a)),
  ];
  await env.DB.batch(stmts);
  return json({ ok: true, fresh });
}

async function getStats(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/api/stats', request.url).toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;

  await ensureSchema(env);
  const [tot, heroes, ends, cups, ach] = await env.DB.batch([
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM lives) AS lives, (SELECT COUNT(*) FROM devices) AS players,
                           (SELECT MIN(ts) FROM lives) AS since, (SELECT ROUND(AVG(age), 1) FROM lives) AS avgAge,
                           (SELECT COUNT(*) FROM lives WHERE hero IS NOT NULL) AS warLives`),
    env.DB.prepare(`SELECT hero, COUNT(*) AS n, SUM(ending IN ('victor', 'shared')) AS g FROM lives WHERE hero IS NOT NULL GROUP BY hero`),
    env.DB.prepare(`SELECT ending, COUNT(*) AS n FROM lives GROUP BY ending`),
    env.DB.prepare(`SELECT cup, COUNT(*) AS n FROM lives WHERE cup IS NOT NULL GROUP BY cup`),
    env.DB.prepare(`SELECT ach, COUNT(*) AS n FROM dev_ach GROUP BY ach`),
  ]);
  const t = tot.results[0] || {};
  const body = {
    ok: true,
    at: Date.now(),
    lives: t.lives || 0,
    players: t.players || 0,
    warLives: t.warLives || 0,
    since: t.since || null,
    avgAge: t.avgAge || null,
    heroes: Object.fromEntries(heroes.results.map(r => [r.hero, [r.n, r.g || 0]])),
    ends: Object.fromEntries(ends.results.map(r => [r.ending, r.n])),
    cups: Object.fromEntries(cups.results.map(r => [r.cup, r.n])),
    ach: Object.fromEntries(ach.results.map(r => [r.ach, r.n])),
  };
  const res = json(body, 200, { 'cache-control': 'public, max-age=600' });
  ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/health') return json({ ok: true, time: new Date().toISOString(), db: !!env.DB });
      if (url.pathname === '/api/life') {
        if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, { allow: 'POST' });
        return await postLife(request, env);
      }
      if (url.pathname === '/api/stats') {
        if (request.method !== 'GET') return json({ ok: false, error: 'method' }, 405, { allow: 'GET' });
        return await getStats(request, env, ctx);
      }
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'not_found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ ok: false, error: 'server' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
