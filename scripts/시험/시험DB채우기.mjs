// 시험(staging) DB 에 데이터를 채운다. 운영 DB 는 **읽기 전용**으로만 연결한다.
//
//   node scripts/시험/시험DB채우기.mjs
//
// 넣는 것: 설정·기준 데이터, 테스트 계정(기업·개인)과 딸린 데이터, 외부(대행) 기업과 그 공고, 관리자 계정.
// 안 넣는 것: 실제 개인회원, 이메일이 있는 비테스트 기업, 방문 기록·알림·인증 토큰·근무 기록 등.
// 비테스트 기업·공고의 연락처 칸(전화·이메일·담당자 등)은 지우고 넣는다.
//
// 구조는 먼저 같아야 한다(backups/staging/prod_schema_public.sql 로 만들었다). 여러 번 돌려도 같은 결과가 되게
// 넣기 전에 대상 표를 비운다 — 시험 DB 에만 하는 일이다.
import fs from "fs";
import pg from "pg";

const 루트 = new URL("../../", import.meta.url).pathname;
const 읽기 = (f) => Object.fromEntries(
  fs.readFileSync(`${루트}${f}`, "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; })
);
const 운영주소 = 읽기(".env.local").DATABASE_URL;
const 시험주소 = 읽기(".env.staging").STAGING_DATABASE_URL;
if (!운영주소 || !시험주소 || 시험주소.includes("여기에비밀번호")) { console.error("접속 정보가 비어 있다"); process.exit(1); }
if (!시험주소.includes("nlwitfgddohqorncyifi")) { console.error("시험 DB 주소가 아니다 — 중단"); process.exit(1); }
if (운영주소.includes("nlwitfgddohqorncyifi")) { console.error("운영 주소 자리에 시험 주소가 들어 있다 — 중단"); process.exit(1); }

// 기준 데이터는 통째로, 나머지는 테스트 범위만. 순서는 부모가 먼저.
const 전체복사 = ["app_settings", "benefit_tags", "job_categories", "notices", "terms", "insights", "admin_users"];
const 범위복사 = [
  "users", "companies", "job_postings",
  "user_profiles", "resumes", "user_careers", "user_certificates", "user_educations", "user_experiences",
  "user_languages", "user_links", "term_agreements", "applications", "proposals", "proposal_messages",
  "company_talent_scraps", "user_company_blocks",
];
// 표마다 비테스트 행의 연락처 칸을 지운다(칸 이름 → 지움).
const 지울칸 = {
  companies: ["business_number", "phone", "representative_name", "address_detail", "manager_name", "company_phone", "email", "password_hash"],
  job_postings: ["external_contact_email", "external_contact_name", "external_contact_phone", "external_contact_kakao"],
};
// 기본 범위. 테스트 계정 + 외부(대행) 기업 / 테스트 개인.
const 기본 = {
  users: "is_test_account",
  companies: "(is_test_account OR email IS NULL)",
};

const 운영 = new pg.Client({ connectionString: 운영주소, ssl: { rejectUnauthorized: false } });
const 시험 = new pg.Client({ connectionString: 시험주소, ssl: { rejectUnauthorized: false } });
await 운영.connect(); await 시험.connect();
await 운영.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");

// FK 로 어느 표를 가리키는지 → 범위 조건을 이어 붙인다.
const fk = (await 운영.query(`
  SELECT c.conrelid::regclass::text AS 표, a.attname AS 칸, c.confrelid::regclass::text AS 부모
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
   WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace`)).rows
  .map((r) => ({ 표: r.표.replace(/^public\./, ""), 칸: r.칸, 부모: r.부모.replace(/^public\./, "") }));
const 포함 = new Set(범위복사);
const 조건캐시 = {};
function 조건(표) {
  if (조건캐시[표]) return 조건캐시[표];
  const 부분 = [];
  if (기본[표]) 부분.push(기본[표]);
  for (const r of fk.filter((x) => x.표 === 표 && 포함.has(x.부모) && x.부모 !== 표)) {
    부분.push(`("${r.칸}" IS NULL OR "${r.칸}" IN (SELECT id FROM "${r.부모}" WHERE ${조건(r.부모)}))`);
  }
  return (조건캐시[표] = 부분.length ? 부분.join(" AND ") : "TRUE");
}

async function 옮기기(표, where) {
  const 지움 = 지울칸[표] || [];
  const { rows } = await 운영.query(`SELECT to_jsonb(t) AS j FROM "${표}" t WHERE ${where}`);
  let 값들 = rows.map((r) => r.j);
  if (지움.length) {
    // 테스트 계정의 연락처는 가짜라 그대로 둔다. 비테스트 행만 지운다.
    값들 = 값들.map((j) => (j.is_test_account === true ? j : Object.fromEntries(Object.entries(j).filter(([k]) => !지움.includes(k)))));
  }
  if (표 === "job_postings") {
    // 공고는 회사가 테스트인지로 가른다.
    const 테스트회사 = new Set((await 운영.query(`SELECT id FROM companies WHERE is_test_account`)).rows.map((r) => r.id));
    값들 = rows.map((r) => r.j).map((j) => (테스트회사.has(j.company_id) ? j : Object.fromEntries(Object.entries(j).filter(([k]) => !지움.includes(k)))));
  }
  for (let i = 0; i < 값들.length; i += 200) {
    const 덩이 = 값들.slice(i, i + 200);
    await 시험.query(`INSERT INTO "${표}" SELECT * FROM jsonb_populate_recordset(NULL::"${표}", $1::jsonb)`, [JSON.stringify(덩이)]);
  }
  return 값들.length;
}

try {
  try { await 시험.query("SET session_replication_role = replica"); } catch { console.log("(참고) FK 검사를 끌 수 없어 부모 순서대로 넣는다"); }
  await 시험.query("BEGIN");
  const 모두 = [...전체복사, ...범위복사];
  await 시험.query(`TRUNCATE ${모두.map((t) => `"${t}"`).join(", ")} CASCADE`);
  const 결과 = [];
  for (const 표 of 전체복사) 결과.push([표, await 옮기기(표, "TRUE")]);
  for (const 표 of 범위복사) 결과.push([표, await 옮기기(표, 조건(표))]);
  await 시험.query("COMMIT");
  console.table(결과.map(([표, 행]) => ({ 표, 행 })));
} catch (e) {
  await 시험.query("ROLLBACK").catch(() => {});
  console.error("실패:", e.message);
  process.exitCode = 1;
} finally {
  await 운영.end(); await 시험.end();
}
