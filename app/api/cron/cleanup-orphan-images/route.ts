export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { supabaseAdmin } from "@/lib/supabase";

// job-images 버킷에 쌓인 '고아' 파일을 주마다 걷어낸다.
//
// 왜 생기나: 관리자 화면에서 외부 공고를 '불러오기' 하면 이미지가 먼저
// 저장되는데, 그 뒤 공고를 저장하지 않고 취소하거나 다시 불러오면 파일만
// 남는다. 지우는 코드가 없어 2026-08 에는 990개 1.1GB 가 쌓여 저장소 한도를
// 넘겼다. 그때는 손으로 지웠다(scripts/cleanup-orphan-images.js).
//
// 사진을 잘못 지우는 일은 되돌릴 수 없으므로 세 겹으로 막는다.
//
//  1. 참조하는 곳 다섯 군데를 모두 확인한다. 한 곳이라도 빠뜨리면 살아 있는
//     사진이 고아로 보인다 — 손으로 지울 때 companies.cover_images 를
//     빠뜨려 100장을 고아로 잘못 셌던 적이 있다.
//  2. 올라온 지 이레가 안 된 파일은 건드리지 않는다. 공고를 쓰다 만 사람이
//     이어서 저장하면 그때 참조가 생긴다. 그 사이에 지우면 안 된다.
//  3. 한 번에 최대 300개. 무언가 잘못돼 대량으로 고아 판정이 나더라도
//     한 번에 다 날아가지는 않는다. 남은 것은 다음 주에 지운다.
//
// DRY=1 을 붙여 부르면 세어만 보고 한 개도 지우지 않는다.
const 유예일 = 7;
const 한번에 = 300;

const 고아SQL = `
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
    UNION SELECT split_part(image_url,'/job-images/',2) FROM job_image_hashes
     WHERE image_url LIKE '%/job-images/%'
    UNION SELECT split_part(public_url,'/job-images/',2) FROM files
     WHERE public_url LIKE '%/job-images/%'
  )
  SELECT o.name, COALESCE((o.metadata->>'size')::bigint, 0) AS size
    FROM storage.objects o
    LEFT JOIN 쓰임 w ON w.path = o.name
   WHERE o.bucket_id = 'job-images'
     AND w.path IS NULL
     AND o.created_at < now() - ($1 || ' days')::interval
   ORDER BY size DESC
   LIMIT $2`;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return err("AUTH_001", "권한이 없습니다.", 401);
  }
  const 세보기만 = new URL(req.url).searchParams.get("dry") === "1";

  try {
    const { rows } = await pool.query(고아SQL, [유예일, 한번에]);
    const 바이트 = rows.reduce((a, r) => a + Number(r.size), 0);
    if (!rows.length) return ok({ 지움: 0, 바이트: 0, 세보기만 });
    if (세보기만) {
      return ok({ 지울것: rows.length, 바이트, 맛보기: rows.slice(0, 5).map((r) => r.name) });
    }

    let 지움 = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const 묶음 = rows.slice(i, i + 100).map((r) => r.name);
      const { error } = await supabaseAdmin.storage.from("job-images").remove(묶음);
      if (error) {
        console.error("[고아 이미지 청소]", error.message);
        break;
      }
      지움 += 묶음.length;
    }
    console.log(`[고아 이미지 청소] ${지움}개 ${(바이트 / 1048576).toFixed(1)}MB`);
    return ok({ 지움, 바이트 });
  } catch (e: any) {
    console.error("[고아 이미지 청소]", e);
    return err("CRON_001", "청소 중 오류가 발생했습니다.", 500);
  }
}
