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
const 만료 = (await c.query(`SELECT to_char(CURRENT_DATE+365,'YYYY-MM-DD') d`)).rows[0].d;
await c.query(
  `UPDATE companies SET kept=$2::jsonb, paid_until=CURRENT_DATE-1 WHERE id=$1`,
  [id, JSON.stringify({ LIGHT: { days: 20, until: 만료 } })]);
r = await c.query(
  `SELECT kept, (paid_until < CURRENT_DATE) AS 이용권끝 FROM companies WHERE id=$1`, [id]);
검사("라이트 칸 20일", r.rows[0].kept.LIGHT.days, 20);
검사("보관 만료 1년 뒤", r.rows[0].kept.LIGHT.until, 만료);
검사("스탠다드 칸 없음", r.rows[0].kept.STANDARD ?? null, null);
검사("이용권 종료됨", r.rows[0].이용권끝, true);

// ── 4. 보관은 같은 상품에만
console.log("\n4. 같은 상품에만 쓰인다");
const 환산 = (from, days, to) => (days > 0 && from === to ? days : 0);
검사("라이트20 → 라이트", 환산("LIGHT",20,"LIGHT"), 20);
검사("라이트20 → 스탠다드", 환산("LIGHT",20,"STANDARD"), 0);
검사("라이트20 → 프리미엄", 환산("LIGHT",20,"PREMIUM"), 0);
검사("프리미엄10 → 라이트", 환산("PREMIUM",10,"LIGHT"), 0);

// ── 5. 같은 상품을 사면 보관분이 얹히고 그 칸은 비워진다
console.log("\n5. 같은 상품 구매 — 보관분 합산");
await c.query(
  `UPDATE companies
      SET plan='LIGHT',
          paid_until = GREATEST(COALESCE(paid_until, CURRENT_DATE-1), CURRENT_DATE-1) + ($2||' days')::interval,
          kept = $3::jsonb
    WHERE id=$1`, [id, String(30 + 20), JSON.stringify({})]);
r = await c.query(
  `SELECT GREATEST(0,(paid_until-CURRENT_DATE)+1) AS 남은, kept FROM companies WHERE id=$1`, [id]);
검사("남은일 50 (30 + 보관 20)", Number(r.rows[0].남은), 50);
검사("라이트 칸 비워짐", r.rows[0].kept.LIGHT ?? null, null);

// ── 6. 다른 상품으로 갈아타면 남은 기간이 쓰던 상품으로 보관된다
console.log("\n6. 갈아타기 — 남은 기간은 쓰던 상품으로 보관");
// 지금 라이트 50일 남음. 여기서 스탠다드 30일을 사면
//   스탠다드는 오늘부터 30일, 라이트 50일은 보관함으로.
await c.query(
  `UPDATE companies
      SET plan='STANDARD',
          paid_until = CURRENT_DATE - 1 + ($2||' days')::interval,
          kept = $3::jsonb
    WHERE id=$1`,
  [id, "30", JSON.stringify({ LIGHT: { days: 50, until: 만료 } })]);
r = await c.query(
  `SELECT plan, GREATEST(0,(paid_until-CURRENT_DATE)+1) AS 남은, kept FROM companies WHERE id=$1`, [id]);
검사("지금 상품 스탠다드", r.rows[0].plan, "STANDARD");
검사("스탠다드 30일 (이어붙이지 않음)", Number(r.rows[0].남은), 30);
검사("라이트 50일 보관됨", r.rows[0].kept.LIGHT.days, 50);
검사("스탠다드 칸은 비어 있음", r.rows[0].kept.STANDARD ?? null, null);

// ── 7. 만료된 칸은 안 쓰인다
console.log("\n7. 만료된 칸은 없는 것으로 본다");
await c.query(
  `UPDATE companies SET kept=$2::jsonb WHERE id=$1`,
  [id, JSON.stringify({ LIGHT: { days: 15, until: "2020-01-01" } })]);
r = await c.query(`SELECT kept FROM companies WHERE id=$1`, [id]);
const 오늘문자 = new Date(Date.now() + 9*36e5).toISOString().slice(0,10);
const 살아있나 = (k, p) => !!(k[p] && k[p].days > 0 && k[p].until >= 오늘문자);
검사("만료 → 살아있음 false", 살아있나(r.rows[0].kept, "LIGHT"), false);

// ── 8. 뒷정리
await c.query(`DELETE FROM job_postings WHERE company_id=$1`, [id]);
await c.query(`DELETE FROM company_orders WHERE company_id=$1`, [id]);
await c.query(`DELETE FROM companies WHERE id=$1`, [id]);
const { rows: [남음] } = await c.query(`SELECT COUNT(*)::int n FROM companies WHERE company_name=$1`, [회사]);
console.log("\n8. 뒷정리");
검사("검증용 기업 삭제됨", 남음.n, 0);

console.log(`\n${통과}/${통과 + 실패} 통과${실패 ? ` — ${실패}건 실패` : ""}\n`);
await c.end();
process.exit(실패 ? 1 : 0);
