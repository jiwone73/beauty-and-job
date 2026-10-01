export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

/**
 * 무료(스타트) 공고는 게재기간(listed_until)이 지나면 공개 목록에서 빠지는데,
 * 회사가 손 댄 적도 없고 job_postings.status도 그대로 ACTIVE라 알아챌 길이
 * 없었다("게재기간때문에 공고가 내려갔다는건 어떻게 알려줄거야?" → "인앱
 * (종아이콘)으로?"). 하루 한 번 돌며 방금 그렇게 된 공고를 찾아 알린다.
 *
 * exposure_notified_at으로 한 번만 보낸다. 재등록(다시 걸기)해서 listed_until이
 * 새로 잡히면 이 값이 NULL로 돌아가(app/api/company/jobs/[id]/route.ts),
 * 다음에 또 끝났을 때 다시 알림이 간다.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const 머리 = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || 머리 !== secret) return err("AUTH_001", "인증이 필요합니다.", 401);

  const { rows } = await pool.query(
    `SELECT jp.id, jp.title, jp.company_id
       FROM job_postings jp
      WHERE jp.status = 'ACTIVE'
        AND jp.exposure_notified_at IS NULL
        AND jp.listed_until IS NOT NULL AND jp.listed_until < CURRENT_DATE
        AND (jp.deadline IS NULL OR jp.deadline >= CURRENT_DATE)`
  );

  let 보낸수 = 0;
  for (const r of rows) {
    try {
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
         VALUES ($1, 'JOB_DEADLINE', '공고 노출이 종료됐어요', $2, $3, 'job_posting')`,
        [r.company_id, `「${r.title}」의 무료 게재기간이 끝나 지금은 노출되지 않아요. 재등록하면 다시 노출됩니다.`, r.id]
      );
      await pool.query(`UPDATE job_postings SET exposure_notified_at = NOW() WHERE id = $1`, [r.id]);
      보낸수++;
    } catch (e) {
      console.error("[exposure-ended]", r.id, e);
    }
  }

  return ok({ 대상: rows.length, 보낸수 });
}
