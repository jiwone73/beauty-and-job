/**
 * 이미 데이터가 쌓여 있는 계정으로 잠깐 들어가 화면을 찍는다.
 *
 * 제안·채팅 화면은 **주고받은 것이 있어야** 찍힌다. 새 계정으로는 빈 화면만
 * 나온다. 그래서 기존 계정의 비밀번호를 잠깐 바꿔 들어가고, 찍은 뒤 원래
 * 해시로 되돌린다. 토큰을 직접 만들어 우회하지 않는 것은 사장님이 실제로
 * 보는 화면과 어긋날 수 있어서다.
 *
 *   node scripts/검증/캡처로그인.mjs 빌리기 <이메일>
 *   node scripts/검증/캡처로그인.mjs 돌려주기
 *
 * 원래 해시는 자료/캡처-원복.json 에 남는다. **찍고 나면 반드시 돌려준다** —
 * 안 돌려주면 그 계정으로 로그인이 안 된다.
 */
import { q, done } from "./q.mjs";
import bcrypt from "bcryptjs";
import fs from "node:fs";

const 원복파일 = "자료/캡처-원복.json";
const 임시비번 = "Capture!2026";
const 할일 = process.argv[2];

if (할일 === "돌려주기") {
  if (!fs.existsSync(원복파일)) { console.log("돌려줄 것이 없습니다."); await done(); process.exit(0); }
  const { id, email, hash } = JSON.parse(fs.readFileSync(원복파일, "utf8"));
  await q(`UPDATE companies SET password_hash = $2 WHERE id = $1`, [id, hash]);
  fs.unlinkSync(원복파일);
  console.log(`돌려줬습니다 — ${email}`);
  await done();
  process.exit(0);
}

const 메일 = process.argv[3];
if (할일 !== "빌리기" || !메일) {
  console.log("쓰는 법: node scripts/검증/캡처로그인.mjs 빌리기 <이메일>");
  await done(); process.exit(1);
}
if (fs.existsSync(원복파일)) {
  console.log("이미 빌린 계정이 있습니다. 먼저 돌려주세요: node scripts/검증/캡처로그인.mjs 돌려주기");
  await done(); process.exit(1);
}

const [c] = await q(`SELECT id, email, password_hash FROM companies WHERE email = $1`, [메일]);
if (!c) { console.log("그런 계정이 없습니다:", 메일); await done(); process.exit(1); }

fs.mkdirSync("자료", { recursive: true });
fs.writeFileSync(원복파일, JSON.stringify({ id: c.id, email: c.email, hash: c.password_hash }));
await q(`UPDATE companies SET password_hash = $2 WHERE id = $1`, [c.id, await bcrypt.hash(임시비번, 10)]);

console.log("빌렸습니다.");
console.log("  이메일  :", 메일);
console.log("  비밀번호:", 임시비번);
console.log("\n찍고 나면 반드시: node scripts/검증/캡처로그인.mjs 돌려주기");
await done();
