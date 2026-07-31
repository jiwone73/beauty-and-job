export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 외부 지원 인박스 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  // 외부 퍼널 지원서: 외부 공고이거나, 이미 통보/연결 단계까지 간 지원서(회원 전환 후에도 유지)
  const rows = await pool.query(
    `SELECT a.id, a.applied_at, a.delivery_status, a.forwarded_at, a.forwarded_channel,
            a.third_party_consent, a.admin_note, a.cover_letter,
            a.notified_at, a.linked_at, a.viewed_at,
            u.name AS applicant_name, u.phone AS applicant_phone, u.email AS applicant_email, u.job_type AS applicant_job_type,
            jp.id AS job_id, jp.title AS job_title, jp.job_type, jp.apply_method, jp.source AS job_source,
            jp.external_contact_email, jp.company_id AS company_id,
            c.company_name AS company_name, c.is_member AS company_is_member,
            c.email::text AS ec_contact_email, c.merged_into_company_id AS claimed_company_id
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id
        AND (jp.source = 'EXTERNAL' OR a.notified_at IS NOT NULL OR a.linked_at IS NOT NULL)
     LEFT JOIN companies c ON c.id = jp.company_id
     JOIN users u ON u.id = a.user_id
     ORDER BY a.applied_at DESC
     LIMIT 500`
  );
  return ok(rows.rows);
}
