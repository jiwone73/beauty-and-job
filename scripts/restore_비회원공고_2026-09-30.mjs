// backups/2026-09-30_비회원공고_전환_스냅샷.json 을 읽어 companies·job_postings를
// 그 시점 값으로 되돌린다. 런칭 직전, 알바 테스트용으로 회원 전환했던 매장
// 100곳 + 오피스 1곳(순수패밀리)을 비회원 상태로 되돌릴 때 쓴다.
//
// 실행: node scripts/restore_비회원공고_2026-09-30.mjs
//
// 주의: 이 스크립트는 "그 스냅샷 시점 값 그대로" 덮어쓴다. 스냅샷 이후 알바가
// 그 회사 정보를 실제로 고쳐 놨다면(예: 지원자 응답 등 새로 생긴 데이터) 그건
// 건드리지 않는다 — companies·job_postings 두 테이블의 컬럼 값만 되돌린다.
import pg from 'pg';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/DATABASE_URL="?([^"\n]+)"?/);
const url = match ? match[1] : process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const backup = JSON.parse(fs.readFileSync('backups/2026-09-30_비회원공고_전환_스냅샷.json', 'utf8'));

async function restoreRow(table, row) {
  const cols = Object.keys(row);
  const sets = cols.filter((c) => c !== 'id').map((c, i) => `"${c}" = $${i + 2}`).join(', ');
  const vals = cols.filter((c) => c !== 'id').map((c) => row[c]);
  await pool.query(`UPDATE ${table} SET ${sets} WHERE id = $1`, [row.id, ...vals]);
}

let n = 0;
for (const c of backup.companies) {
  await restoreRow('companies', c);
  n++;
}
for (const j of backup.job_postings) {
  await restoreRow('job_postings', j);
  n++;
}
console.log(`복원 완료: 회사 ${backup.companies.length}곳, 공고 ${backup.job_postings.length}건 (총 ${n}행)`);
await pool.end();
