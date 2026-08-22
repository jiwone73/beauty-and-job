// job-images 버킷에서 '고아' 파일만 골라 지운다.
//
// 고아 = 아래 다섯 곳 어디에서도 참조하지 않는 파일. 하나라도 빠뜨리면 살아
// 있는 사진을 지우게 되므로 전부 확인한다.
//   job_postings.cover_images / .detail_images
//   companies.cover_images
//   job_image_hashes.image_url
//   files.public_url
//
// 이 찌꺼기가 생기는 이유: 관리자 화면에서 외부 공고를 '불러오기' 하면 이미지가
// 먼저 저장되는데, 그 뒤 공고를 저장하지 않고 취소하거나 다시 불러오면 파일만
// 남는다. 지우는 코드가 없어 쌓이기만 했다(2026-08 기준 990개 1.1GB).
//
// 쓰는 법
//   node scripts/cleanup-orphan-images.js /tmp/orphans.txt        목록만 뽑고 멈춤
//   GO=1 node scripts/cleanup-orphan-images.js /tmp/orphans.txt   실제로 지움
//
// 지울 목록은 항상 파일로 먼저 남기고, GO=1 이 없으면 한 개도 건드리지 않는다.

const fs=require("fs");
for(const l of fs.readFileSync(".env.local","utf8").split("\n")){const m=l.match(/^([A-Z_]+)=(.*)$/);if(m)process.env[m[1]]=m[2].replace(/^"|"$/g,"");}
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} });
const OUT = process.argv[2];
const 고아SQL = `
  WITH 쓰임 AS (
    SELECT split_part(e->>'url','/job-images/',2) AS path FROM job_postings jp, LATERAL jsonb_array_elements(COALESCE(jp.cover_images,'[]'::jsonb)) e WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(e->>'url','/job-images/',2) FROM job_postings jp, LATERAL jsonb_array_elements(COALESCE(jp.detail_images,'[]'::jsonb)) e WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(e->>'url','/job-images/',2) FROM companies c, LATERAL jsonb_array_elements(COALESCE(c.cover_images,'[]'::jsonb)) e WHERE e->>'url' LIKE '%/job-images/%'
    UNION SELECT split_part(image_url,'/job-images/',2) FROM job_image_hashes WHERE image_url LIKE '%/job-images/%'
    UNION SELECT split_part(public_url,'/job-images/',2) FROM files WHERE public_url LIKE '%/job-images/%'
  )
  SELECT o.name, (o.metadata->>'size')::bigint AS size
    FROM storage.objects o LEFT JOIN 쓰임 w ON w.path = o.name
   WHERE o.bucket_id='job-images' AND w.path IS NULL
   ORDER BY size DESC`;
const 총량 = `SELECT count(*)::int n, COALESCE(sum((metadata->>'size')::bigint),0)::bigint b FROM storage.objects WHERE bucket_id='job-images'`;
const MB = x => (Number(x)/1024/1024).toFixed(1)+' MB';
(async () => {
  const before = (await pool.query(총량)).rows[0];
  const r = await pool.query(고아SQL);
  const list = r.rows;
  fs.writeFileSync(OUT, list.map(x=>`${x.name}\t${x.size}`).join("\n"));
  console.log(`지우기 전 : ${before.n}개 ${MB(before.b)}`);
  console.log(`고아       : ${list.length}개 ${MB(list.reduce((a,x)=>a+Number(x.size),0))}  → 목록 ${OUT}`);
  if (process.env.GO !== "1") { console.log("(GO=1 이 아니라 여기서 멈춤 — 아무것도 지우지 않음)"); await pool.end(); return; }
  let done=0, fail=0;
  for (let i=0;i<list.length;i+=100){
    const chunk = list.slice(i,i+100).map(x=>x.name);
    const { error } = await sb.storage.from('job-images').remove(chunk);
    if (error) { fail+=chunk.length; console.log("  실패", error.message); }
    else done+=chunk.length;
    process.stdout.write(`\r  지우는 중 ${done}/${list.length}`);
  }
  console.log("");
  const after = (await pool.query(총량)).rows[0];
  console.log(`지운 뒤   : ${after.n}개 ${MB(after.b)}   (성공 ${done}, 실패 ${fail})`);
  await pool.end();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
