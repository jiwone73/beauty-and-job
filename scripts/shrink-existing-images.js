// 이미 저장된 공고 사진을 제자리에서 줄인다.
//
// 왜: 2026-08 에 올리는 길목마다 가로 1600px 로 줄이도록 고쳤지만(lib/imageShrink.ts)
// 그 전에 원본 그대로 넣어 둔 것이 227장 257MB 남아 있다. 한 장에 7MB 짜리도
// 있는데 이 사진들이 실제로 보이는 곳은 공고 본문 칸(952px)뿐이라 고해상도
// 원본을 들고 있을 이유가 없다.
//
// 제자리에 덮어쓴다. 주소가 그대로여야 공고에 적힌 링크가 안 깨진다.
// 덮어쓰면 옛 파일은 사라진다 — 되돌릴 수 없다.
//
// 건드리지 않는 것
//   · 공고·회사가 쓰지 않는 파일(고아). 그건 크론이 걷어간다.
//   · 300KB 이하이고 가로 1600px 이하인 것 — 이미 충분히 작다.
//   · 투명한 곳이 있는 사진 — JPEG 로 바꾸면 검게 찬다. 드물어서 그냥 둔다.
//   · 줄였는데 오히려 커진 것.
//
// 쓰는 법
//   node scripts/shrink-existing-images.js          세어만 보고 멈춤
//   GO=1 node scripts/shrink-existing-images.js     실제로 덮어씀

const fs = require("fs");
for (const l of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const 공개 = process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/job-images/";

const 가로상한 = 1600;
const 그냥둘크기 = 300 * 1024;
const MB = (x) => (Number(x) / 1048576).toFixed(1) + "MB";

// 살아 있는 것만 — 공고 배너·상세, 회사 커버, files 에서 참조하는 파일.
const 대상SQL = `
  WITH 쓰임 AS (
    SELECT split_part(e->>'url','/job-images/',2) AS path
      FROM job_postings jp, LATERAL jsonb_array_elements(COALESCE(jp.cover_images,'[]'::jsonb)) e
     WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(e->>'url','/job-images/',2)
      FROM job_postings jp, LATERAL jsonb_array_elements(COALESCE(jp.detail_images,'[]'::jsonb)) e
     WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(e->>'url','/job-images/',2)
      FROM companies c, LATERAL jsonb_array_elements(COALESCE(c.cover_images,'[]'::jsonb)) e
     WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(public_url,'/job-images/',2) FROM files WHERE public_url LIKE '%/job-images/%'
  )
  SELECT o.name, (o.metadata->>'size')::bigint AS size
    FROM storage.objects o JOIN 쓰임 w ON w.path = o.name
   WHERE o.bucket_id = 'job-images' AND (o.metadata->>'size')::bigint > $1
   ORDER BY size DESC`;

(async () => {
  const { rows } = await pool.query(대상SQL, [그냥둘크기]);
  const 전 = rows.reduce((a, r) => a + Number(r.size), 0);
  console.log(`대상 ${rows.length}장  ${MB(전)}`);
  if (process.env.GO !== "1") {
    console.log("(GO=1 이 아니라 여기서 멈춤 — 한 장도 건드리지 않음)");
    await pool.end();
    return;
  }

  let 줄임 = 0, 그대로 = 0, 실패 = 0, 후 = 0;
  for (const [i, r] of rows.entries()) {
    process.stdout.write(`\r  ${i + 1}/${rows.length}  줄임 ${줄임} 그대로 ${그대로} 실패 ${실패}   `);
    try {
      const res = await fetch(공개 + r.name);
      if (!res.ok) { 실패++; 후 += Number(r.size); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf, { failOn: "none", sequentialRead: true }).metadata();
      if (meta.hasAlpha || /gif/i.test(meta.format || "")) { 그대로++; 후 += buf.length; continue; }

      const out = await sharp(buf, { failOn: "none", sequentialRead: true })
        .rotate()
        .resize({ width: 가로상한, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      if (out.byteLength >= buf.byteLength) { 그대로++; 후 += buf.length; continue; }

      // 같은 주소에 덮어쓴다. 파일명 확장자가 .png 여도 브라우저는 헤더의
      // content-type 을 따르므로 그대로 보인다.
      const { error } = await sb.storage.from("job-images")
        .upload(r.name, out, { contentType: "image/jpeg", upsert: true });
      if (error) { 실패++; 후 += buf.length; console.log("\n  실패", r.name, error.message); continue; }
      줄임++; 후 += out.byteLength;
    } catch (e) {
      실패++; 후 += Number(r.size);
      console.log("\n  오류", r.name, e.message);
    }
  }
  console.log(`\n전 ${MB(전)} → 후 ${MB(후)}  (줄임 ${줄임}, 그대로 ${그대로}, 실패 ${실패})`);
  await pool.end();
})();
