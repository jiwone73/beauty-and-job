// 대행(EXTERNAL) 공고의 「비공개」를 전부 켠다. 바꾸기 전 값은 파일로 남긴다.
// --apply 없이 돌리면 무엇이 바뀌는지 보여주기만 한다.
import fs from "fs";
import pg from "pg";
const url = fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const 적용 = process.argv.includes("--apply");

const { rows } = await pool.query(
  `SELECT id, title, contact_name_hidden, contact_phone_hidden, contact_email_hidden, contact_kakao_hidden
     FROM job_postings WHERE source = $1 ORDER BY created_at DESC`, ["EXTERNAL"]);

const 바꿀것 = rows.filter((r) =>
  !r.contact_name_hidden || !r.contact_phone_hidden || !r.contact_email_hidden || !r.contact_kakao_hidden);

const 백업 = `_to_delete/비공개_바꾸기전_${new Date().toISOString().slice(0, 10)}.json`;
fs.writeFileSync(백업, JSON.stringify(rows, null, 2));
console.log(`대행 공고 ${rows.length}건 — 바꿀 것 ${바꿀것.length}건`);
console.log(`바꾸기 전 값 전부 저장: ${백업}`);

if (적용) {
  const r = await pool.query(
    `UPDATE job_postings SET contact_name_hidden = true, contact_phone_hidden = true,
       contact_email_hidden = true, contact_kakao_hidden = true
     WHERE source = $1`, ["EXTERNAL"]);
  console.log(`적용했습니다 — ${r.rowCount}건.`);
} else {
  console.log("※ 미리보기입니다. 적용하려면 --apply");
}
await pool.end();
