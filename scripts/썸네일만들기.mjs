// 목록 카드용 400px 사진을 기존 사진 옆에 만들어 둔다.
//
// 카드는 `원본이름-t400.webp` 를 먼저 찾고 없으면 원본으로 되돌아간다. 그래서
// 이 스크립트는 새 파일만 더할 뿐 기존 것을 건드리지 않는다. 여러 번 돌려도 된다.
//
//   node scripts/썸네일만들기.mjs          → 진행 중 공고가 쓰는 사진만
//   node scripts/썸네일만들기.mjs --all    → 기업 로고·간판·커버까지

import fs from "fs";
import pg from "pg";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")]; })
);

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const 전부 = process.argv.includes("--all");

const 꼬리 = "-t400.webp";
const 썸경로 = (p) => p.replace(/\.(jpe?g|png|webp|gif)$/i, "") + 꼬리;

function 쪼개기(url) {
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

const { rows } = await pool.query(`
  SELECT DISTINCT u FROM (
    SELECT jp.cover_images->0->>'url' AS u FROM job_postings jp WHERE jp.status = 'ACTIVE'
    UNION ALL
    SELECT jp.detail_images->0->>'url' FROM job_postings jp WHERE jp.status = 'ACTIVE'
    ${전부 ? `UNION ALL SELECT c.signboard_url FROM companies c
              UNION ALL SELECT c.logo_url FROM companies c
              UNION ALL SELECT c.cover_images->0->>'url' FROM companies c` : `
    UNION ALL
    SELECT c.signboard_url FROM companies c JOIN job_postings j2 ON j2.company_id = c.id AND j2.status = 'ACTIVE'
    UNION ALL
    SELECT c.logo_url FROM companies c JOIN job_postings j2 ON j2.company_id = c.id AND j2.status = 'ACTIVE'`}
  ) t WHERE u LIKE '%/storage/v1/object/public/%' AND u !~ '${꼬리}'
`);

console.log(`대상 ${rows.length}장`);
let 만듦 = 0, 이미 = 0, 실패 = 0, 원본합 = 0, 썸합 = 0;

for (const { u } of rows) {
  const 자리 = 쪼개기(u);
  if (!자리) { 실패++; continue; }
  const 새경로 = 썸경로(자리.path);
  try {
    const 있나 = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${자리.bucket}/${새경로}`, { method: "HEAD" });
    if (있나.ok) { 이미++; continue; }

    const r = await fetch(u);
    if (!r.ok) { 실패++; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    원본합 += buf.byteLength;

    const out = await sharp(buf, { failOn: "none", sequentialRead: true })
      .rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
    썸합 += out.byteLength;

    const { error } = await sb.storage.from(자리.bucket)
      .upload(새경로, out, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
    if (error) { console.error(" 실패", 새경로, error.message); 실패++; continue; }
    만듦++;
    if (만듦 % 20 === 0) console.log(`  ${만듦}장…`);
  } catch (e) {
    console.error(" 실패", 자리.path, e.message);
    실패++;
  }
}

const MB = (n) => (n / 1048576).toFixed(1) + "MB";
console.log(`\n만듦 ${만듦} · 이미 있던 것 ${이미} · 실패 ${실패}`);
if (만듦) console.log(`원본 ${MB(원본합)} → 썸네일 ${MB(썸합)} (${Math.round(100 - (썸합 / 원본합) * 100)}% 줄어듦)`);
await pool.end();
process.exit(0);
