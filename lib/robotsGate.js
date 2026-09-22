// 검색엔진 차단 3곳(app/robots.ts · next.config.js · app/layout.tsx)을 묶는
// 단일 스위치. next.config.js 는 CommonJS라 .ts 파일을 그대로 못 불러오므로
// 이 파일만 순수 JS로 둔다 — 세 곳이 전부 여기 하나만 본다.
//
// 오픈일(10/12)에 이 값만 true로 바꾸고 커밋·배포하면 셋이 한 번에 풀린다.
// 지금은 false — 로그인 전용 시험만 하고 있어 노출되면 안 된다.
module.exports = { 검색공개: false };
