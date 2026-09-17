/**
 * 목록이 어떻게 보이는지 눈으로 보려고, 회원 기업에만 상품을 임시로 붙인다.
 *
 * **비회원은 건드리지 않는다.** 비회원 공고는 실제로 걸려 있는 남의 공고라,
 * 여기에 상품을 붙이면 우리가 팔지도 않은 자리를 남에게 준 것이 된다.
 * 회원 여부는 이메일로 가른다(비회원은 이메일이 없다).
 *
 *   node scripts/검증/상품미리보기.mjs        ← 붙이기
 *   node scripts/검증/상품미리보기.mjs 원복    ← 되돌리기
 *
 * 붙이기 전에 회원 전원의 지금 상태를 자료/회원-상품-원복.json 에 남긴다.
 * 원복은 그 파일을 그대로 되돌려 쓴다 — 파일이 없으면 원복이 안 되므로 지우지 말 것.
 */
import { q, done } from "./q.mjs";
import fs from "node:fs";

const 원복파일 = "자료/회원-상품-원복.json";
const 원복인가 = process.argv[2] === "원복";

if (원복인가) {
  if (!fs.existsSync(원복파일)) {
    console.log("원복 파일이 없습니다:", 원복파일);
    await done();
    process.exit(1);
  }
  const 원본 = JSON.parse(fs.readFileSync(원복파일, "utf8"));
  for (const c of 원본) {
    await q(`UPDATE companies SET plan = $2, paid_until = $3::date WHERE id = $1`,
            [c.id, c.plan, c.paid_until]);
  }
  console.log(`되돌렸습니다 — 회원 ${원본.length}곳`);
  await done();
  process.exit(0);
}

// ── 지금 상태를 먼저 남긴다 ──────────────────────────────────────
const 원본 = await q(
  `SELECT id, company_name, plan, to_char(paid_until,'YYYY-MM-DD') AS paid_until
     FROM companies WHERE email IS NOT NULL`);
fs.mkdirSync("자료", { recursive: true });
fs.writeFileSync(원복파일, JSON.stringify(원본, null, 1));
console.log(`스냅샷 ${원본.length}곳 → ${원복파일}`);

// ── 공고를 걸어 둔 회원 기업만 고른다 ────────────────────────────
const 대상 = await q(
  `SELECT c.id, c.company_name, COUNT(j.id)::int AS 공고
     FROM companies c JOIN v_active_jobs j ON j.company_id = c.id
    WHERE c.email IS NOT NULL
    GROUP BY c.id, c.company_name ORDER BY c.company_name`);

/** 위에서부터 프리미엄 2 · 스탠다드 4 · 라이트 6, 나머지는 무료로 둔다. */
const 배정 = (i) => (i < 2 ? "PREMIUM" : i < 6 ? "STANDARD" : i < 12 ? "LIGHT" : null);

for (const [i, c] of 대상.entries()) {
  const p = 배정(i);
  if (p) await q(`UPDATE companies SET plan = $2, paid_until = CURRENT_DATE + 30 WHERE id = $1`, [c.id, p]);
  else   await q(`UPDATE companies SET plan = NULL, paid_until = NULL WHERE id = $1`, [c.id]);
  console.log(`  ${(p ?? "무료").padEnd(9)} ${c.company_name} (공고 ${c.공고}건)`);
}

// ── 비회원에 손이 갔는지 확인 ────────────────────────────────────
const [v] = await q(`SELECT COUNT(*)::int AS n FROM companies WHERE email IS NULL AND plan IS NOT NULL`);
console.log(`\n비회원 중 상품이 붙은 곳: ${v.n}건 (0이어야 정상)`);

const 줄 = await q(
  `SELECT COALESCE(company_plan::text,'무료') AS 등급, COUNT(*)::int AS 공고
     FROM v_active_jobs GROUP BY 1 ORDER BY 2 DESC`);
console.log("\n목록에 걸리는 공고:");
for (const r of 줄) console.log(`  ${r.등급.padEnd(9)} ${r.공고}건`);

await done();
