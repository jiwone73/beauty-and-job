/**
 * 상품 페이지에 넣을 화면을 찍으려고 잠깐 쓰는 기업 계정.
 *
 * 인재검색·제안·채팅은 **스탠다드 이상만 열리는 화면**이라, 로그인하지 않으면
 * 찍을 수가 없다. 토큰을 직접 만들어 우회하면 실제 사장님이 보는 화면과
 * 달라질 수 있어 제대로 된 계정으로 들어간다.
 *
 *   node scripts/검증/캡처계정.mjs 만들기
 *   node scripts/검증/캡처계정.mjs 지우기
 *
 * 만들기는 스탠다드 30일이 붙은 계정을 하나 세우고, 지우기는 흔적을 지운다.
 * 찍고 나면 **반드시 지운다** — 목록·관리자 화면에 남으면 그것도 가짜 데이터다.
 */
import { q, done } from "./q.mjs";
import bcrypt from "bcryptjs";

const 메일 = "capture@beautywork.test";
const 비번 = "Capture!2026";
const 할일 = process.argv[2] ?? "만들기";

if (할일 === "지우기") {
  const { rowCount } = await q(`DELETE FROM companies WHERE email = $1`, [메일]);
  console.log(rowCount ? "지웠습니다." : "지울 것이 없습니다.");
  await done();
  process.exit(0);
}

const 해시 = await bcrypt.hash(비번, 10);
await q(`DELETE FROM companies WHERE email = $1`, [메일]);
const [c] = await q(
  `INSERT INTO companies (company_name, email, password_hash, status, company_type, plan, paid_until)
   VALUES ($1, $2, $3, 'ACTIVE', 'STORE', 'STANDARD', CURRENT_DATE + 30)
   RETURNING id`,
  ["화면캡처용", 메일, 해시]);

console.log("만들었습니다.");
console.log("  이메일  :", 메일);
console.log("  비밀번호:", 비번);
console.log("  등급    : 스탠다드 (30일)");
console.log("  id      :", c.id);
console.log("\n찍고 나면 반드시: node scripts/검증/캡처계정.mjs 지우기");
await done();
