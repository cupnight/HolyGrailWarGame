# 성배가 차는 밤

비공식 팬 제작 성배전쟁 시뮬레이션 게임입니다.

- 플레이: https://holygrailwargame.cupnight.workers.dev/
- `public/` — 게임 파일. 클라우드플레어 Workers가 이 폴더를 그대로 내줍니다. (스프라이트는 `public/assets/sprites/`)
- `src/worker.js` — `/api/` 요청을 받는 서버 코드
- `wrangler.jsonc` — 클라우드플레어 설정
- 루트의 `index.html`, `sw.js` — 예전 주소(깃헙 페이지)로 들어온 사람의 기록을 챙겨 새 주소로 보내는 안내 페이지
