// 알바가 이벤트 상태를 시험하도록 준비한다 — 매장 테스트 계정 st01~st10 을 이벤트 체험(프리미엄)으로 바꾸고,
// 이벤트 가입 기간의 시작일을 오늘로 당긴다.
//
// **시험(staging) DB 에서만 돈다.** 운영 DB 주소(.env.local)는 읽지 않는다 — 주소에 시험 프로젝트 ID 가 없으면 멈춘다.
// 운영 설정(시작일 2026-10-12)은 이 스크립트가 건드리지 않는다.
//
//   node scripts/시험/이벤트시험계정.mjs dry      ← 바뀔 것만 보고 되돌림
//   node scripts/시험/이벤트시험계정.mjs commit   ← 적용(바꾸기 전 값은 backups/ 에 저장)
//   node scripts/시험/이벤트시험계정.mjs restore  ← 원래대로(계정 plan 비움, 시작일 10/12)
import fs from "fs";
import pg from "pg";

const 루트 = new URL("../../", import.meta.url).pathname;
const env = Object.fromEntries(
  fs.readFileSync(`${루트}.env.staging`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const 모드 = process.argv[2] || "dry";
const 이메일들 = [...Array(10)].map((_, i) => `btwk2026+st${String(i + 1).padStart(2, "0")}@gmail.com`);
const 오늘 = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const 끝날 = (() => { // 승인일(오늘)+3개월-1일 — lib/companyEntitlement.ts 의 개월더하기와 같은 규칙
  const [y, m, d] = 오늘.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + 3, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  const r = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last)) - 864e5);
  return r.toISOString().slice(0, 10);
})();

const 주소 = env.STAGING_DATABASE_URL || "";
if (!주소.includes("nlwitfgddohqorncyifi") || 주소.includes("여기에비밀번호")) { console.error("시험 DB 주소가 아니다 — 중단"); process.exit(1); }
const pool = new pg.Pool({ connectionString: 주소, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();
try {
  await c.query("BEGIN");
  const 설정 = JSON.parse((await c.query(`SELECT value FROM app_settings WHERE key='event_showcase'`)).rows[0].value);
  if (모드 === "restore") {
    const r = await c.query(`UPDATE companies SET plan=NULL, plan_source=NULL, paid_until=NULL, updated_at=now() WHERE email = ANY($1) AND plan_source='EVENT'`, [이메일들]);
    await c.query(`UPDATE app_settings SET value=$1 WHERE key='event_showcase'`, [JSON.stringify({ ...설정, from: "2026-10-12" })]);
    console.log("원복: 계정", r.rowCount, "· 시작일 2026-10-12");
  } else {
    const 전 = await c.query(`SELECT email, plan, plan_source, paid_until::text FROM companies WHERE email = ANY($1) ORDER BY email`, [이메일들]);
    if (모드 === "commit") fs.writeFileSync(`${루트}backups/${오늘}_이벤트시험_st01-10_이전값.json`, JSON.stringify({ companies: 전.rows, event_showcase: 설정 }, null, 1));
    const r = await c.query(`UPDATE companies SET plan='PREMIUM', plan_source='EVENT', paid_until=$2::date, updated_at=now() WHERE email = ANY($1) AND plan IS NULL AND plan_source IS NULL`, [이메일들, 끝날]);
    await c.query(`UPDATE app_settings SET value=$1 WHERE key='event_showcase'`, [JSON.stringify({ ...설정, from: 오늘 })]);
    console.log("적용: 계정", r.rowCount, `· 체험 ${오늘} ~ ${끝날} · 시작일 ${오늘}`);
  }
  await c.query(모드 === "dry" ? "ROLLBACK" : "COMMIT");
  console.log(모드 === "dry" ? "(시험 실행 — 되돌렸음)" : "완료");
} catch (e) { await c.query("ROLLBACK"); console.error(e); }
c.release(); await pool.end();
