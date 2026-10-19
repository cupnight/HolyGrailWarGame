// 성배가 차는 밤 — 서버 쪽 코드
// 게임 파일(public/)은 클라우드플레어가 바로 내주고, 여기서는 /api/ 요청만 받는다.
//
//   GET  /api/health  상태 확인
//   POST /api/life    한 생이 끝날 때 게임 결과를 익명으로 받는다
//   GET  /api/stats   모인 결과를 합쳐 돌려준다 (10분 동안 캐시)
//   POST /api/ghost   살아남은 조를 다른 겨울로 보낸다 (이름을 공개하기로 한 경우에만 이름 포함)
//   GET  /api/ghost   ?year=&dev= — 1~40년 앞선 전쟁에서 살아남은 다른 기기의 조를 몇 개 받는다
//   POST /api/ghost/shown · /withdraw · /report — 등장 횟수, 거두기, 신고(3번이면 숨김)
//   POST /api/ghost/result  그 조가 끼어든 전쟁의 결과(받은 기기가 전쟁이 끝날 때 한 번 보냄)
//   POST /api/ghost/news    보낸 기기가 자기 조들의 결과 소식을 받아 간다(받은 쪽 플레이어 정보는 담지 않음)
//
// 받는 것: 서번트·클래스, 엔딩 종류, 성배 상태, 도시, 출신, 회로 등급, 사망 나이, 언어,
//          그 기기에서 지금까지 연 업적 목록, 기기마다 무작위로 만든 번호.
// 받지 않는 것: 이름, 소원·유언처럼 직접 쓴 문장, IP 주소.
//   (이름 신고만은 같은 사람이 여러 번 신고하지 못하도록, 접속 주소를 서버만 아는 값으로 섞어 되돌릴 수 없게 만든
//    짧은 값을 신고 기록에 함께 남긴다. 접속 주소 자체는 저장하지 않는다.)
//
// 보안: 모든 요청은 누구나 스크립트로 보낼 수 있다고 보고 검사한다.
//   - 본문 크기를 읽으면서 제한한다(content-length를 믿지 않는다)
//   - 서번트·클래스·업적·출신·도시는 게임에 있는 값만 받는다(src/known.js, 빌드 때 자동 생성)
//   - 모든 /api/ 요청에 접속 주소별 속도 제한을 건다
//   - 한 기기가 하루에 보낼 수 있는 결과 수, 보낼 수 있는 조 수를 제한한다
//   - 신고는 서로 다른 접속 주소 3곳에서 와야 숨김 처리된다
import { KNOWN } from './known.js';

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...extra },
  });

const HEROES = KNOWN.heroes, ACH = new Set(KNOWN.ach), ORIGINS = new Set(KNOWN.origins), CITIES = new Set(KNOWN.cities);
const heroOk = h => (typeof h === 'string' && Object.prototype.hasOwnProperty.call(HEROES, h) ? h : null);

// 본문을 읽으면서 크기를 센다. 넘으면 그 자리에서 멈춘다.
async function readJson(request, max) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { try { await reader.cancel(); } catch {} throw new TooBig(); }
    chunks.push(value);
  }
  const buf = new Uint8Array(size); let o = 0;
  for (const c of chunks) { buf.set(c, o); o += c.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(buf)); } catch { return null; }
}
class TooBig extends Error {}

const ipOf = request => request.headers.get('cf-connecting-ip') || 'x';
// 접속 주소별 속도 제한(분당 20번). 종류마다 따로 센다.
async function slowDown(env, request, kind) {
  if (!env.RL) return false;
  const { success } = await env.RL.limit({ key: kind + ':' + ipOf(request) });
  return !success;
}
const SLOW = () => json({ ok: false, error: 'slow_down' }, 429);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS lives (
     id TEXT PRIMARY KEY, ts INTEGER NOT NULL, dev TEXT NOT NULL, lang TEXT,
     hero TEXT, cls TEXT, ending TEXT NOT NULL, cup TEXT, city TEXT, origin TEXT, circuit INTEGER, age INTEGER)`,
  `CREATE INDEX IF NOT EXISTS lives_hero ON lives(hero)`,
  `CREATE TABLE IF NOT EXISTS devices (dev TEXT PRIMARY KEY, first INTEGER NOT NULL, last INTEGER NOT NULL, lives INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS dev_ach (dev TEXT NOT NULL, ach TEXT NOT NULL, PRIMARY KEY (dev, ach))`,
  `CREATE TABLE IF NOT EXISTS ghosts (
     id TEXT PRIMARY KEY, dev TEXT NOT NULL, created INTEGER NOT NULL, year INTEGER NOT NULL,
     hero TEXT NOT NULL, cls TEXT NOT NULL, lang TEXT, data TEXT NOT NULL,
     shown INTEGER NOT NULL DEFAULT 0, reports INTEGER NOT NULL DEFAULT 0, hidden INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS ghosts_year ON ghosts(year)`,
  `CREATE TABLE IF NOT EXISTS ghost_reports (id TEXT NOT NULL, dev TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (id, dev))`,
  `CREATE INDEX IF NOT EXISTS lives_dev ON lives(dev, ts)`,
  `CREATE INDEX IF NOT EXISTS ghosts_dev ON ghosts(dev)`,
  `CREATE TABLE IF NOT EXISTS ghost_seen (id TEXT NOT NULL, dev TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (id, dev))`,
  `CREATE TABLE IF NOT EXISTS ghost_flags (id TEXT NOT NULL, who TEXT NOT NULL, dev TEXT, ts INTEGER NOT NULL, PRIMARY KEY (id, who))`,
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ghost_results (
     id TEXT NOT NULL, dev TEXT NOT NULL, owner TEXT NOT NULL, ts INTEGER NOT NULL,
     year INTEGER NOT NULL, city TEXT, join_day INTEGER NOT NULL, ending TEXT NOT NULL, out_day INTEGER, tod TEXT, by_who TEXT, ally INTEGER NOT NULL DEFAULT 0,
     name TEXT, hero TEXT, cls TEXT, sent_year INTEGER, sent_city TEXT, PRIMARY KEY (id, dev))`,
  `CREATE INDEX IF NOT EXISTS ghost_results_owner ON ghost_results(owner, ts)`,
];
let schemaReady = null;
const ensureSchema = env => (schemaReady ??= env.DB.batch(SCHEMA.map(s => env.DB.prepare(s))).catch(e => { schemaReady = null; throw e; }));

const ENDINGS = new Set(['shared', 'victor', 'lost', 'survived', 'collapsed', 'withdrew', 'refused', 'dead', 'none']);
const ID = /^[A-Za-z0-9_-]{1,40}$/;               // 서번트·업적·클래스·출신 같은 내부 이름
const str = (v, re) => (typeof v === 'string' && re.test(v) ? v : null);
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);

async function postLife(request, env) {
  if (await slowDown(env, request, 'l')) return SLOW();
  const b = await readJson(request, 8000);
  if (!b) return json({ ok: false, error: 'bad_json' }, 400);
  if (b.v !== 1) return json({ ok: false, error: 'bad_version' }, 400);

  const id = str(b.life, ID), dev = str(b.dev, ID), ending = ENDINGS.has(b.end) ? b.end : null;
  if (!id || !dev || !ending) return json({ ok: false, error: 'bad_fields' }, 400);
  const hero = heroOk(b.hero), cls = hero && b.cls === HEROES[hero] ? b.cls : null;
  const cup = b.cup === 'pure' || b.cup === 'dark' ? b.cup : null;
  const lang = ['ko', 'en', 'ja'].includes(b.lang) ? b.lang : null;
  const ach = Array.isArray(b.ach) ? [...new Set(b.ach.filter(a => typeof a === 'string' && ACH.has(a)))] : [];
  const city = typeof b.city === 'string' && CITIES.has(b.city) ? b.city : null;
  const origin = typeof b.origin === 'string' && ORIGINS.has(b.origin) ? b.origin : null;
  const now = Date.now();

  await ensureSchema(env);
  // 한 기기가 하루에 보낼 수 있는 결과는 150개까지
  const day = await env.DB.prepare(`SELECT COUNT(*) AS n FROM lives WHERE dev = ? AND ts > ?`).bind(dev, now - 864e5).first();
  if (day && day.n >= 150) return json({ ok: false, error: 'too_many' }, 429);
  const ins = await env.DB.prepare(
    `INSERT OR IGNORE INTO lives (id, ts, dev, lang, hero, cls, ending, cup, city, origin, circuit, age)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, now, dev, lang, hero, hero ? cls : null, ending, cup, city, origin, int(b.circuit, 0, 9), int(b.age, 0, 150)).run();
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


// ---- 다른 겨울에서 온 조 ----
// A가 살아남은 조를 보내고(POST /api/ghost), B의 전쟁이 열릴 때 1~40년 앞선 전쟁의 조를 받아 간다(GET /api/ghost).
const NAME_OK = /^[0-9A-Za-z가-힣ぁ-んァ-ヶー一-龯 .·'-]{1,20}$/;
const BAD = ['씨발', '시발', 'ㅅㅂ', '병신', 'ㅂㅅ', '좆', '존나', '개새', '새끼', '니미', '느금', '애미', '애비', '섹스', '보지', '자지', '창녀', '걸레', '장애인', '틀딱', '한남', '김치녀', '일베',
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'nigg', 'fag', 'rape', 'nazi', 'hitler', 'porn', 'sex',
  'ちんこ', 'まんこ', 'セックス', '死ね', 'きちがい', 'ガイジ'];
const badName = n => { const t = n.toLowerCase().replace(/[\s.·'-]/g, ''); return BAD.some(w => t.includes(w)); };
const GHOST_ENDS = new Set(['victor', 'shared', 'survived', 'withdrew']);
const TACS = new Set(['proud', 'hunter', 'cunning', 'defensive', 'naive', 'reckless', 'desperate']);

function cleanGhost(b) {
  const name = typeof b.name === 'string' ? b.name.trim().replace(/\s+/g, ' ') : '';
  if (!NAME_OK.test(name)) return [null, 'bad_name'];
  if (badName(name)) return [null, 'name_blocked'];
  const hero = heroOk(b.hero), cls = hero && b.cls === HEROES[hero] ? b.cls : null, year = int(b.year, 1900, 2140);
  if (!hero || !cls || !year || !GHOST_ENDS.has(b.end)) return [null, 'bad_fields'];
  const know = Array.isArray(b.know) ? [...new Map(b.know.slice(0, 12).filter(k => k && heroOk(k.h) && k.h !== hero).map(k => [k.h, k])).values()].slice(0, 8).map(k => ({
    h: k.h, n: k.n ? 1 : 0, a: k.a ? 1 : 0, f: k.f ? 1 : 0, k: k.k ? 1 : 0, al: k.al ? 1 : 0,
  })) : [];
  return [{
    name, hero, cls, year, end: b.end,
    sex: b.sex === 'f' ? 'f' : 'm',
    age: int(b.age, 10, 90) ?? 25,
    city: typeof b.city === 'string' && CITIES.has(b.city) ? b.city : '',
    circuit: int(b.circuit, 0, 9) ?? 0,
    trust: int(b.trust, 0, 100) ?? 50,
    bond: int(b.bond, 0, 200) ?? 50,
    kills: int(b.kills, 0, 9) ?? 0,
    seals: int(b.seals, 0, 3) ?? 0,
    pw: int(b.pw, 40, 95) ?? 70,
    tac: TACS.has(b.tac) ? b.tac : 'defensive',
    know,
  }, null];
}

async function postGhost(request, env) {
  if (await slowDown(env, request, 'g')) return SLOW();
  const b = await readJson(request, 6000);
  if (!b) return json({ ok: false, error: 'bad_json' }, 400);
  const dev = str(b.dev, ID);
  if (b.v !== 1 || !dev) return json({ ok: false, error: 'bad_fields' }, 400);
  const [g, err] = cleanGhost(b);
  if (!g) return json({ ok: false, error: err }, 400);
  await ensureSchema(env);
  const mine = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ghosts WHERE dev = ?`).bind(dev).first();
  if (mine && mine.n >= 30) return json({ ok: false, error: 'too_many' }, 429);
  const id = 'g' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const lang = ['ko', 'en', 'ja'].includes(b.lang) ? b.lang : null;
  await env.DB.prepare(`INSERT INTO ghosts (id, dev, created, year, hero, cls, lang, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, dev, Date.now(), g.year, g.hero, g.cls, lang, JSON.stringify(g)).run();
  return json({ ok: true, id });
}

async function getGhost(request, url, env) {
  if (await slowDown(env, request, 'q')) return SLOW();
  const year = int(Number(url.searchParams.get('year')), 1900, 2140);
  const dev = str(url.searchParams.get('dev'), ID) || '-';
  if (!year) return json({ ok: false, error: 'bad_year' }, 400);
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    `SELECT id, data FROM ghosts WHERE hidden = 0 AND dev != ? AND year BETWEEN ? AND ? ORDER BY random() LIMIT 4`
  ).bind(dev, year - 40, year - 1).all();
  const list = results.map(r => ({ id: r.id, ...JSON.parse(r.data) }));
  return json({ ok: true, list });
}

async function ghostShown(request, env) {
  if (await slowDown(env, request, 's')) return SLOW();
  const b = await readJson(request, 500);
  const id = str(b && b.id, ID), dev = str(b && b.dev, ID);
  if (!id || !dev) return json({ ok: false, error: 'bad_fields' }, 400);
  await ensureSchema(env);
  // 같은 기기에서 같은 조는 한 번만 센다
  const r = await env.DB.prepare(`INSERT OR IGNORE INTO ghost_seen (id, dev, ts) SELECT id, ?, ? FROM ghosts WHERE id = ?`).bind(dev, Date.now(), id).run();
  if (r.meta && r.meta.changes > 0) await env.DB.prepare(`UPDATE ghosts SET shown = shown + 1 WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

async function withdrawGhost(request, env) {
  if (await slowDown(env, request, 'w')) return SLOW();
  const b = await readJson(request, 500);
  const id = str(b && b.id, ID), dev = str(b && b.dev, ID);
  if (!id || !dev) return json({ ok: false, error: 'bad_fields' }, 400);
  await ensureSchema(env);
  const r = await env.DB.prepare(`DELETE FROM ghosts WHERE id = ? AND dev = ?`).bind(id, dev).run();
  return json({ ok: true, removed: (r.meta && r.meta.changes) || 0 });
}

// 접속 주소를 서버만 아는 무작위 값과 섞어 되돌릴 수 없는 짧은 값으로 바꾼다(신고 중복 확인용)
let saltP = null;
const salt = env => (saltP ??= (async () => {
  const rnd = [...crypto.getRandomValues(new Uint8Array(24))].map(x => x.toString(16).padStart(2, '0')).join('');
  await env.DB.prepare(`INSERT OR IGNORE INTO meta (k, v) VALUES ('salt', ?)`).bind(rnd).run();
  const row = await env.DB.prepare(`SELECT v FROM meta WHERE k = 'salt'`).first();
  return row.v;
})().catch(e => { saltP = null; throw e; }));
async function whoKey(env, request) {
  const data = new TextEncoder().encode((await salt(env)) + '|' + ipOf(request));
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return [...h.slice(0, 8)].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function reportGhost(request, env) {
  if (await slowDown(env, request, 'r')) return SLOW();
  const b = await readJson(request, 500);
  const id = str(b && b.id, ID), dev = str(b && b.dev, ID);
  if (!id || !dev) return json({ ok: false, error: 'bad_fields' }, 400);
  await ensureSchema(env);
  const who = await whoKey(env, request);
  const r = await env.DB.prepare(`INSERT OR IGNORE INTO ghost_flags (id, who, dev, ts) SELECT id, ?, ?, ? FROM ghosts WHERE id = ?`).bind(who, dev, Date.now(), id).run();
  if (r.meta && r.meta.changes > 0) {
    // 서로 다른 접속 주소 3곳에서 신고가 오면 숨긴다
    await env.DB.prepare(`UPDATE ghosts SET reports = (SELECT COUNT(*) FROM ghost_flags WHERE ghost_flags.id = ghosts.id),
                            hidden = CASE WHEN (SELECT COUNT(*) FROM ghost_flags WHERE ghost_flags.id = ghosts.id) >= 3 THEN 1 ELSE hidden END
                          WHERE id = ?`).bind(id).run();
  }
  return json({ ok: true });
}

// 그 조가 끼어든 전쟁의 결과. 실제로 그 조를 만난 기기(ghost_seen)만, 조마다 한 번 보낼 수 있다.
const RESULT_ENDS = new Set(['win', 'shared', 'alive', 'out']);
async function ghostResult(request, env) {
  if (await slowDown(env, request, 'x')) return SLOW();
  const b = await readJson(request, 800);
  const id = str(b && b.id, ID), dev = str(b && b.dev, ID);
  if (!id || !dev || !RESULT_ENDS.has(b.end)) return json({ ok: false, error: 'bad_fields' }, 400);
  const year = int(b.year, 1900, 2140), join = int(b.join, 1, 14);
  const out = b.end === 'out', day = out ? int(b.day, 1, 14) : null;
  if (!year || !join || (out && (!day || day < join))) return json({ ok: false, error: 'bad_fields' }, 400);
  const tod = out && ['낮', '밤', '새벽'].includes(b.tod) ? b.tod : null;
  const by = out && ['me', 'other', 'none'].includes(b.by) ? b.by : null;
  const city = typeof b.city === 'string' && CITIES.has(b.city) ? b.city : '';
  await ensureSchema(env);
  const g = await env.DB.prepare(`SELECT g.dev AS owner, g.year AS year, g.data AS data FROM ghosts g JOIN ghost_seen s ON s.id = g.id AND s.dev = ? WHERE g.id = ?`).bind(dev, id).first();
  if (!g) return json({ ok: false, error: 'not_seen' }, 404);
  if (year <= g.year || year > g.year + 40) return json({ ok: false, error: 'bad_fields' }, 400);
  const d = JSON.parse(g.data);
  await env.DB.prepare(`INSERT OR IGNORE INTO ghost_results (id, dev, owner, ts, year, city, join_day, ending, out_day, tod, by_who, ally, name, hero, cls, sent_year, sent_city)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, dev, g.owner, Date.now(), year, city, join, b.end, day, tod, by, b.ally ? 1 : 0, d.name, d.hero, d.cls, d.year, d.city || '').run();
  return json({ ok: true });
}

// 보낸 기기가 자기 조들의 소식을 받아 간다. 기기 번호는 주소에 남지 않도록 본문으로 받는다.
async function ghostNews(request, env) {
  if (await slowDown(env, request, 'n')) return SLOW();
  const b = await readJson(request, 300);
  const dev = str(b && b.dev, ID);
  if (!dev) return json({ ok: false, error: 'bad_fields' }, 400);
  await ensureSchema(env);
  const { results } = await env.DB.prepare(
    `SELECT id, ts, year, city, join_day, ending, out_day, tod, by_who, ally, name, hero, cls, sent_year, sent_city
       FROM ghost_results WHERE owner = ? ORDER BY ts DESC LIMIT 200`).bind(dev).all();
  const list = results.map(r => ({ id: r.id, ts: r.ts, year: r.year, city: r.city || '', join: r.join_day, end: r.ending, day: r.out_day, tod: r.tod,
    by: r.by_who, ally: !!r.ally, name: r.name, hero: r.hero, cls: r.cls, sentYear: r.sent_year, sentCity: r.sent_city || '' }));
  return json({ ok: true, list });
}

async function getStats(request, env, ctx) {
  if (await slowDown(env, request, 't')) return SLOW();
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
      if (url.pathname === '/api/ghost') {
        if (request.method === 'POST') return await postGhost(request, env);
        if (request.method === 'GET') return await getGhost(request, url, env);
        return json({ ok: false, error: 'method' }, 405);
      }
      if (request.method === 'POST' && url.pathname === '/api/ghost/shown') return await ghostShown(request, env);
      if (request.method === 'POST' && url.pathname === '/api/ghost/withdraw') return await withdrawGhost(request, env);
      if (request.method === 'POST' && url.pathname === '/api/ghost/report') return await reportGhost(request, env);
      if (request.method === 'POST' && url.pathname === '/api/ghost/result') return await ghostResult(request, env);
      if (request.method === 'POST' && url.pathname === '/api/ghost/news') return await ghostNews(request, env);
      if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'not_found' }, 404);
    } catch (e) {
      if (e instanceof TooBig) return json({ ok: false, error: 'too_big' }, 413);
      console.error(e);
      return json({ ok: false, error: 'server' }, 500);
    }
    return env.ASSETS.fetch(request);
  },
};
