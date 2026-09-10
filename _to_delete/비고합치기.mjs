// 비고를 상세요강 끝으로 옮긴다. 상세요강에 이미 있는 말은 안 옮긴다.
// --apply 를 붙이지 않으면 무엇이 바뀌는지 보여주기만 한다.
import fs from "fs";
import pg from "pg";

const url = fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g, "");
const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const 적용 = process.argv.includes("--apply");

const 열쇠 = (줄) => {
  const 전체 = 줄.replace(/\s+/g, "");
  const i = 전체.indexOf(":");
  if (i <= 0 || i > 12) return { 전체, 정규: 전체 };
  const 라벨 = 전체.slice(0, i).replace(/(조건|사항|내용|여부|정보)$/, "");
  const 값 = 전체.slice(i + 1);
  return { 전체, 정규: (라벨 && 값) ? `${라벨}:${값}` : 전체 };
};
const 있나 = (담긴, 이번) => 담긴.some((앞) =>
  앞.전체 === 이번.전체 || 앞.정규 === 이번.정규
  || (이번.전체.length >= 8 && 앞.전체.includes(이번.전체)));

const { rows } = await pool.query(
  "SELECT id, title, description, notes FROM job_postings WHERE notes IS NOT NULL AND btrim(notes)<>$1 ORDER BY created_at DESC", [""]);

let 옮김 = 0, 버림 = 0;
for (const r of rows) {
  const 본문 = String(r.description || "");
  const 담긴 = 본문.split("\n").map(열쇠).filter((k) => k.전체);
  const 남길 = [];
  for (const 줄 of String(r.notes).split("\n")) {
    const k = 열쇠(줄);
    if (!k.전체) continue;
    if (있나(담긴, k)) continue;
    담긴.push(k); 남길.push(줄.trim());
  }
  const 새본문 = 남길.length ? (본문.trim() + "\n\n" + 남길.join("\n")) : 본문.trim();
  console.log("─".repeat(56));
  console.log(String(r.title).slice(0, 40));
  console.log(`  비고 ${String(r.notes).split("\n").filter((s)=>s.trim()).length}줄 → 옮길 ${남길.length}줄`);
  남길.forEach((l) => console.log("   + " + l.slice(0, 66)));
  if (남길.length) 옮김++; else 버림++;
  if (적용) {
    await pool.query("UPDATE job_postings SET description=$1, notes=NULL WHERE id=$2", [새본문 || null, r.id]);
  }
}
console.log("─".repeat(56));
console.log(`${rows.length}건 — 내용 옮긴 것 ${옮김}건, 전부 중복이라 비운 것 ${버림}건`);
console.log(적용 ? "적용했습니다." : "※ 미리보기입니다. 적용하려면 --apply");
await pool.end();
