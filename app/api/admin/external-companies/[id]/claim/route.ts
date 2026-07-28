export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";

// 외부 기업 → 회원계정 이관(claim): 외부 공고·지원을 회원 기업으로 넘김
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const ecId = params.id;
  const b = await req.json().catch(() => ({}));
  const companyId = (b.company_id || "").trim();
  if (!companyId) return err("VALIDATION_001", "연결할 회원 기업을 선택해주세요.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ec = await client.query(`SELECT id, claimed_company_id FROM external_companies WHERE id = $1`, [ecId]);
    if (ec.rowCount === 0) { await client.query("ROLLBACK"); return err("NOT_FOUND", "외부 기업을 찾을 수 없습니다.", 404); }
    const co = await client.query(`SELECT id, company_name FROM companies WHERE id = $1`, [companyId]);
    if (co.rowCount === 0) { await client.query("ROLLBACK"); return err("NOT_FOUND", "회원 기업을 찾을 수 없습니다.", 404); }

    // 1) 외부 기업에 회원계정 연결
    await client.query(`UPDATE external_companies SET claimed_company_id = $2, updated_at = now() WHERE id = $1`, [ecId, companyId]);

    // 2) 이 외부 기업의 외부 공고를 회원 공고로 전환
    const jobs = await client.query(
      `UPDATE job_postings
       SET company_id = $2, source = 'NATIVE', apply_method = 'NATIVE', updated_at = now()
       WHERE external_company_id = $1 AND source = 'EXTERNAL'
       RETURNING id`,
      [ecId, companyId]
    );
    const jobIds = jobs.rows.map((r) => r.id);

    // 3) 해당 공고들의 외부 지원 상태 해제(회원 지원자 관리로 편입)
    if (jobIds.length > 0) {
      await client.query(
        `UPDATE applications SET delivery_status = NULL
         WHERE job_posting_id = ANY($1::uuid[]) AND delivery_status IS NOT NULL`,
        [jobIds]
      );
    }

    await client.query("COMMIT");
    return ok({ external_company_id: ecId, company_id: companyId, company_name: co.rows[0].company_name, moved_jobs: jobIds.length });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("[external claim]", e);
    return err("SERVER_001", "이관 중 오류가 발생했습니다.", 500);
  } finally {
    client.release();
  }
}
