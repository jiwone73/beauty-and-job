export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, requireAuth } from "@/lib/api";

// 외부 지원 인박스 목록
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const rows = await pool.query(
    `SELECT a.id, a.applied_at, a.delivery_status, a.forwarded_at, a.forwarded_channel,
            a.third_party_consent, a.admin_note, a.cover_letter,
            u.name AS applicant_name, u.phone AS applicant_phone, u.email AS applicant_email, u.job_type AS applicant_job_type,
            jp.id AS job_id, jp.title AS job_title, jp.job_type, jp.apply_method,
            jp.external_contact_email,
            c.company_name AS company_name, c.email::text AS ec_contact_email, null::uuid AS claimed_company_id
     FROM applications a
     JOIN job_postings jp ON jp.id = a.job_posting_id AND jp.source = 'EXTERNAL'
     LEFT JOIN companies c ON c.id = jp.company_id
     JOIN users u ON u.id = a.user_id
     ORDER BY (a.delivery_status = 'PENDING') DESC, a.applied_at DESC
     LIMIT 300`
  );
  return ok(rows.rows);
}
