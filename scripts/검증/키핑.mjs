import fs from "node:fs";
import pg from "pg";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const c = new pg.Client({ connectionString: env.DATABASE_URL || env.POSTGRES_URL, ssl: { rejectUnauthorized: false } });
await c.connect();

let 통과 = 0, 실패 = 0;
const 검사 = (이름, 실제, 기대) => {
  const ok = JSON.stringify(실제) === JSON.stringify(기대);
  console.log(`${ok ? "  ✓" : "  ✗"} ${이름}${ok ? "" : `  기대 ${JSON.stringify(기대)} / 실제 ${JSON.stringify(실제)}`}`);
  ok ? 통과++ : 실패++;
};

const BASE = "http://localhost:3000";
const 회사 = "[검증-키핑] 테스트매장";
await c.query(`DELETE FROM company_orders WHERE company_id IN (SELECT id FROM companies WHERE company_name = $1)`, [회사]);
await c.query(`DELETE FROM job_postings   WHERE company_id IN (SELECT id FROM companies WHERE company_name = $1)`, [회사]);
await c.query(`DELETE FROM companies WHERE company_name = $1`, [회사]);

const { rows: [기업] } = await c.query(
  `INSERT INTO companies (company_name, company_type, email, password_hash, phone, status)
   VALUES ($1, 'STORE', $2, 'x', '02-0000-0000', 'ACTIVE') RETURNING id`,
  [회사, `keep-test-${Date.now()}@example.com`]
);
const id = 기업.id;
console.log(`\n기업 ${id}\n`);

// ── 1. 라이트 30일을 붙이고, 열흘 쓴 것으로 만든다 (남은 20일)
console.log("1. 라이트 30일 중 20일 남은 상태");
await c.query(`UPDATE companies SET plan='LIGHT', paid_until = CURRENT_DATE + 19 WHERE id=$1`, [id]);
let r = await c.query(`SELECT GREATEST(0,(paid_until-CURRENT_DATE)+1) AS 남은 FROM companies WHERE id=$1`, [id]);
검사("남은일 20", Number(r.rows[0].남은), 20);

// ── 2. 걸린 공고가 있으면 보관 못 한다
console.log("\n2. 공고가 걸려 있으면 보관 거절");
await c.query(
  `INSERT INTO job_postings (company_id, title, status, listed_until, job_type)
   VALUES ($1, '[검증] 공고', 'ACTIVE', CURRENT_DATE + 19, 'STORE')`, [id]);
const { rows: [걸림] } = await c.query(
  `SELECT COUNT(*)::int n FROM job_postings WHERE company_id=$1 AND status='ACTIVE'`, [id]);
검사("진행 중 공고 1건", 걸림.n, 1);

// ── 3. 공고를 닫고 보관 (라우트 로직과 같은 SQL)
console.log("\n3. 공고 마감 후 보관");
await c.query(`UPDATE job_postings SET status='CLOSED' WHERE company_id=$1`, [id]);
await c.query(
  `UPDATE companies SET kept_days=$2, kept_plan='LIGHT', kept_until=CURRENT_DATE+365,
          paid_until=CURRENT_DATE-1 WHERE id=$1`, [id, 20]);
r = await c.query(
  `SELECT kept_days, kept_plan, (kept_until = CURRENT_DATE+365) AS 만료맞음,
          (paid_until < CURRENT_DATE) AS 이용권끝 FROM companies WHERE id=$1`, [id]);
검사("보관 20일", r.rows[0].kept_days, 20);
검사("보관 플랜 LIGHT", r.rows[0].kept_plan, "LIGHT");
검사("보관 만료 1년 뒤", r.rows[0].만료맞음, true);
검사("이용권 종료됨", r.rows[0].이용권끝, true);

// ── 4. 환산 — 라이트 20일을 프리미엄/스탠다드에서 쓰면
console.log("\n4. 다른 플랜 환산 (하루 값 비율, 내림)");
const 하루 = { LIGHT: 49000/30, STANDARD: 89000/30, PREMIUM: 149000/30 };
const 환산 = (from, days, to) => from === to ? days : Math.floor(days * 하루[from] / 하루[to]);
검사("라이트20 → 라이트", 환산("LIGHT",20,"LIGHT"), 20);
검사("라이트20 → 스탠다드", 환산("LIGHT",20,"STANDARD"), 11);
검사("라이트20 → 프리미엄", 환산("LIGHT",20,"PREMIUM"), 6);
검사("프리미엄10 → 라이트", 환산("PREMIUM",10,"LIGHT"), 30);

// ── 5. 라이트 30일 주문을 입금확인 → 30+20=50일, 보관함 비워짐
console.log("\n5. 입금 확인 시 보관분 합산");
const 얹을 = 환산("LIGHT", 20, "LIGHT");
await c.query(
  `UPDATE companies
      SET plan='LIGHT',
          paid_until = GREATEST(COALESCE(paid_until, CURRENT_DATE-1), CURRENT_DATE-1) + ($2||' days')::interval,
          kept_days = CASE WHEN $3::int>0 THEN 0 ELSE kept_days END,
          kept_plan = CASE WHEN $3::int>0 THEN NULL ELSE kept_plan END,
          kept_until = CASE WHEN $3::int>0 THEN NULL ELSE kept_until END
    WHERE id=$1`, [id, String(30 + 얹을), 얹을]);
r = await c.query(
  `SELECT GREATEST(0,(paid_until-CURRENT_DATE)+1) AS 남은, kept_days, kept_plan, kept_until
     FROM companies WHERE id=$1`, [id]);
검사("남은일 50 (30 + 보관 20)", Number(r.rows[0].남은), 50);
검사("보관함 비워짐", r.rows[0].kept_days, 0);
검사("보관 플랜 지워짐", r.rows[0].kept_plan, null);
검사("보관 만료일 지워짐", r.rows[0].kept_until, null);

// ── 6. 만료된 보관분은 안 쓰인다
console.log("\n6. 만료된 보관분은 없는 것으로 본다");
await c.query(`UPDATE companies SET kept_days=15, kept_plan='LIGHT', kept_until=CURRENT_DATE-1 WHERE id=$1`, [id]);
r = await c.query(
  `SELECT (kept_until IS NOT NULL AND kept_until >= CURRENT_DATE) AS 살아있음 FROM companies WHERE id=$1`, [id]);
검사("만료 → 살아있음 false", r.rows[0].살아있음, false);

// ── 7. 뒷정리
await c.query(`DELETE FROM job_postings WHERE company_id=$1`, [id]);
await c.query(`DELETE FROM company_orders WHERE company_id=$1`, [id]);
await c.query(`DELETE FROM companies WHERE id=$1`, [id]);
const { rows: [남음] } = await c.query(`SELECT COUNT(*)::int n FROM companies WHERE company_name=$1`, [회사]);
console.log("\n7. 뒷정리");
검사("검증용 기업 삭제됨", 남음.n, 0);

console.log(`\n${통과}/${통과 + 실패} 통과${실패 ? ` — ${실패}건 실패` : ""}\n`);
await c.end();
process.exit(실패 ? 1 : 0);
