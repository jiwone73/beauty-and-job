/**
 * 목록에 걸려 있는 가짜 공고를 내린다.
 *
 * 지우지 않고 **마감(CLOSED)** 으로 돌린다 — 지우면 되돌릴 수 없고, 나중에
 * 화면을 다시 볼 때 쓸 데가 있다. 목록·검색·메인 어디에도 안 뜨는 것은 같다.
 *
 *   node scripts/검증/샘플내리기.mjs        ← 내리기
 *   node scripts/검증/샘플내리기.mjs 되돌리기
 *
 * 대상은 둘뿐이다.
 *   - is_sample 이 켜진 공고 (화면 채우려고 만든 가짜)
 *   - 테스트 계정(jiwone73+*, *@test.com)이 올린 공고
 *
 * 크롤링해 온 남의 공고(171건)는 **건드리지 않는다.** 가짜가 아니라 실제
 * 공고이고, 지우면 목록이 17건으로 줄어 사이트가 텅 빈다. 그건 따로 정할 일이다.
 */
import { q, done } from "./q.mjs";

const 되돌리기 = process.argv[2] === "되돌리기";

const 대상 = `
  (COALESCE(j.is_sample, false)
   OR c.email ~* 'jiwone73\\+|@test\\.com|@beautywork\\.test')
`;

const 앞 = await q(`
  SELECT c.company_name AS 기업, left(j.title, 34) AS 제목, j.status::text AS 상태
    FROM job_postings j JOIN companies c ON c.id = j.company_id
   WHERE ${대상} AND j.status = $1
   ORDER BY c.company_name`, [되돌리기 ? "CLOSED" : "ACTIVE"]);

if (앞.length === 0) {
  console.log(되돌리기 ? "되돌릴 것이 없습니다." : "내릴 것이 없습니다.");
  await done();
  process.exit(0);
}

console.log(`${되돌리기 ? "되돌릴" : "내릴"} 공고 ${앞.length}건`);
for (const r of 앞) console.log(`  ${r.기업} — ${r.제목}`);

const { rowCount } = await q(
  되돌리기
    ? `UPDATE job_postings j SET status = 'ACTIVE', closed_at = NULL
         FROM companies c WHERE c.id = j.company_id AND ${대상} AND j.status = 'CLOSED'`
    : `UPDATE job_postings j SET status = 'CLOSED', closed_at = now()
         FROM companies c WHERE c.id = j.company_id AND ${대상} AND j.status = 'ACTIVE'`);

const [v] = await q(`SELECT COUNT(*)::int AS n FROM v_active_jobs`);
console.log(`\n${되돌리기 ? "되돌렸습니다" : "내렸습니다"} — ${rowCount}건`);
console.log(`목록에 남은 공고: ${v.n}건`);

await done();
