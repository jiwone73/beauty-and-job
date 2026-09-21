export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";

/**
 * 확정된 면접 약속이 다가오면 양쪽에 잊지 말라고 알린다.
 *
 * 하루 한 번 도는 크론이라 이틀 앞선 약속까지 넉넉히 본다 — 하루만 보면
 * 크론이 한 번 밀리는 사이 당일이 돼 버린 약속을 놓친다. 대신 한 번
 * 알린 약속은 reminded_at 을 찍어 두 번 다시 알리지 않는다.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const 머리 = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!secret || 머리 !== secret) return err("AUTH_001", "인증이 필요합니다.", 401);

  const { rows } = await pool.query(
    `SELECT m.id, m.appointment_at, m.appointment_place,
            p.user_id, p.company_id, p.job_posting_id,
            u.name AS user_name, COALESCE(co.brand_name, co.company_name) AS company_name,
            jp.title AS job_title
       FROM proposal_messages m
       JOIN proposals p ON p.id = m.proposal_id
       JOIN users u ON u.id = p.user_id
       JOIN companies co ON co.id = p.company_id
       JOIN job_postings jp ON jp.id = p.job_posting_id
      WHERE m.kind = 'APPOINTMENT' AND m.appointment_status = 'ACCEPTED'
        AND m.reminded_at IS NULL
        AND m.appointment_at BETWEEN NOW() AND NOW() + INTERVAL '48 hours'`
  );

  let 보낸수 = 0;
  for (const r of rows) {
    const 때 = new Date(r.appointment_at).toLocaleString("ko-KR", {
      month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit",
    });
    const 장소꼬리 = r.appointment_place ? ` · ${r.appointment_place}` : "";
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
         VALUES ($1, 'APPT_SOON', '면접 약속이 다가와요', $2, $3, 'job_posting')`,
        [r.user_id, `${r.company_name}과(와)의 「${r.job_title}」 면접이 ${때}${장소꼬리}이에요.`, r.job_posting_id]
      );
      await pool.query(
        `INSERT INTO notifications (company_id, type, title, message, related_id, related_type)
         VALUES ($1, 'APPT_SOON', '면접 약속이 다가와요', $2, $3, 'job_posting')`,
        [r.company_id, `${r.user_name}님과의 「${r.job_title}」 면접이 ${때}${장소꼬리}이에요.`, r.job_posting_id]
      );
      await pool.query(`UPDATE proposal_messages SET reminded_at = NOW() WHERE id = $1`, [r.id]);
      보낸수++;
    } catch (e) {
      console.error("[appointment-reminder]", r.id, e);
    }
  }

  return ok({ 대상: rows.length, 보낸수 });
}
